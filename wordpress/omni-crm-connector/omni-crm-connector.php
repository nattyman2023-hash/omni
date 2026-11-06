<?php
/**
 * Plugin Name: Omni CRM Connector
 * Description: Sends every Elementor form submission to the Omni CRM as a lead (signed webhook), retries failed deliveries hourly, and can send existing submissions. Settings > Omni CRM.
 * Version: 1.0.0
 * Author: Omni Developments
 * Requires at least: 6.4
 * Requires PHP: 7.4
 * Text Domain: omni-crm-connector
 */

defined( 'ABSPATH' ) || exit;

define( 'OMNI_CRM_VERSION', '1.0.0' );
const OMNI_CRM_OPTION   = 'omni_crm_connector';
const OMNI_CRM_QUEUE    = 'omni_crm_queue';
const OMNI_CRM_LOG      = 'omni_crm_log';
const OMNI_CRM_CRON     = 'omni_crm_retry';
const OMNI_CRM_QUEUE_MAX = 200;

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

function omni_crm_settings() {
	$saved = get_option( OMNI_CRM_OPTION, array() );
	$saved = is_array( $saved ) ? $saved : array();
	return array(
		'endpoint' => defined( 'OMNI_CRM_ENDPOINT' ) ? (string) OMNI_CRM_ENDPOINT : (string) ( $saved['endpoint'] ?? '' ),
		'secret'   => defined( 'OMNI_CRM_SECRET' ) ? (string) OMNI_CRM_SECRET : (string) ( $saved['secret'] ?? '' ),
	);
}

function omni_crm_configured() {
	$settings = omni_crm_settings();
	return '' !== $settings['endpoint'] && strlen( $settings['secret'] ) >= 32;
}

function omni_crm_site_host() {
	return (string) wp_parse_url( home_url(), PHP_URL_HOST );
}

/* -------------------------------------------------------------------------
 * Delivery
 * ---------------------------------------------------------------------- */

/**
 * Posts one payload to the CRM. Returns array( 'ok' => bool, 'status' => int, 'message' => string ).
 * 200 (already received) and 201 (created) both count as delivered.
 */
function omni_crm_send( array $payload ) {
	if ( ! omni_crm_configured() ) {
		return array( 'ok' => false, 'status' => 0, 'message' => 'Connector is not configured.' );
	}
	$settings  = omni_crm_settings();
	$body      = wp_json_encode( $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	$timestamp = (string) time();
	$response  = wp_remote_post(
		$settings['endpoint'],
		array(
			'timeout'  => 8,
			'blocking' => true,
			'headers'  => array(
				'Content-Type'     => 'application/json',
				'Accept'           => 'application/json',
				'X-Omni-Timestamp' => $timestamp,
				'X-Omni-Signature' => 'sha256=' . hash_hmac( 'sha256', $timestamp . '.' . $body, $settings['secret'] ),
			),
			'body'     => $body,
		)
	);
	if ( is_wp_error( $response ) ) {
		return array( 'ok' => false, 'status' => 0, 'message' => $response->get_error_message() );
	}
	$status  = (int) wp_remote_retrieve_response_code( $response );
	$decoded = json_decode( (string) wp_remote_retrieve_body( $response ), true );
	$message = is_array( $decoded ) ? (string) ( $decoded['message'] ?? ( $decoded['reference'] ?? '' ) ) : '';
	return array( 'ok' => 200 === $status || 201 === $status, 'status' => $status, 'message' => $message );
}

function omni_crm_log( $external_id, array $result ) {
	$log = get_option( OMNI_CRM_LOG, array() );
	$log = is_array( $log ) ? $log : array();
	array_unshift(
		$log,
		array(
			'time'    => time(),
			'id'      => (string) $external_id,
			'ok'      => (bool) $result['ok'],
			'status'  => (int) $result['status'],
			'message' => substr( (string) $result['message'], 0, 200 ),
		)
	);
	update_option( OMNI_CRM_LOG, array_slice( $log, 0, 25 ), false );
}

function omni_crm_queue_add( array $payload ) {
	$queue = get_option( OMNI_CRM_QUEUE, array() );
	$queue = is_array( $queue ) ? $queue : array();
	$queue[ $payload['externalId'] ] = $payload;
	if ( count( $queue ) > OMNI_CRM_QUEUE_MAX ) {
		$queue = array_slice( $queue, -OMNI_CRM_QUEUE_MAX, null, true );
	}
	update_option( OMNI_CRM_QUEUE, $queue, false );
}

/** Sends a payload; on failure keeps it in the retry queue. Never throws. */
function omni_crm_deliver( array $payload ) {
	$result = omni_crm_send( $payload );
	omni_crm_log( $payload['externalId'], $result );
	// 4xx other than 408/429 means the CRM rejected the content; retrying would not help.
	$retryable = ! $result['ok'] && ( 0 === $result['status'] || $result['status'] >= 500 || in_array( $result['status'], array( 408, 429 ), true ) || 401 === $result['status'] );
	if ( $retryable ) {
		omni_crm_queue_add( $payload );
	}
	return $result;
}

add_action(
	OMNI_CRM_CRON,
	function () {
		$queue = get_option( OMNI_CRM_QUEUE, array() );
		if ( ! is_array( $queue ) || ! $queue ) {
			return;
		}
		$remaining = array();
		foreach ( $queue as $id => $payload ) {
			$result = omni_crm_send( $payload );
			omni_crm_log( $id, $result );
			if ( ! $result['ok'] && ( 0 === $result['status'] || $result['status'] >= 500 || in_array( $result['status'], array( 401, 408, 429 ), true ) ) ) {
				$remaining[ $id ] = $payload;
			}
		}
		update_option( OMNI_CRM_QUEUE, $remaining, false );
	}
);

register_activation_hook(
	__FILE__,
	function () {
		if ( ! wp_next_scheduled( OMNI_CRM_CRON ) ) {
			wp_schedule_event( time() + 300, 'hourly', OMNI_CRM_CRON );
		}
	}
);
register_deactivation_hook(
	__FILE__,
	function () {
		wp_clear_scheduled_hook( OMNI_CRM_CRON );
	}
);

/* -------------------------------------------------------------------------
 * Elementor submissions → payloads
 * ---------------------------------------------------------------------- */

function omni_crm_submission_payload( $submission_id ) {
	global $wpdb;
	$submission = $wpdb->get_row( $wpdb->prepare( "SELECT id, post_id, referer_title, form_name, created_at_gmt FROM {$wpdb->prefix}e_submissions WHERE id = %d", $submission_id ), ARRAY_A );
	if ( ! $submission ) {
		return null;
	}
	$values = $wpdb->get_results( $wpdb->prepare( "SELECT `key`, `value` FROM {$wpdb->prefix}e_submissions_values WHERE submission_id = %d ORDER BY id", $submission_id ), ARRAY_A );
	$fields = array();
	foreach ( $values as $row ) {
		$fields[ (string) $row['key'] ] = (string) $row['value'];
	}
	$page = (string) $submission['referer_title'];
	if ( '' === $page && $submission['post_id'] ) {
		$page = get_the_title( (int) $submission['post_id'] );
	}
	return array(
		'externalId'  => 'elementor:' . omni_crm_site_host() . ':' . (int) $submission['id'],
		'form'        => (string) $submission['form_name'],
		'page'        => $page,
		'site'        => omni_crm_site_host(),
		'submittedAt' => gmdate( 'Y-m-d\TH:i:s\Z', strtotime( $submission['created_at_gmt'] . ' UTC' ) ),
		'fields'      => (object) $fields,
	);
}

/**
 * Runs after Elementor's own actions (including "save submission"), so the stored submission is
 * normally available; its id is used so a later backfill never duplicates a live lead.
 */
add_action(
	'elementor_pro/forms/new_record',
	function ( $record ) {
		try {
			if ( ! omni_crm_configured() || ! is_object( $record ) || ! method_exists( $record, 'get' ) ) {
				return;
			}
			global $wpdb;
			$element_id = (string) $record->get_form_settings( 'id' );
			$fields     = array();
			foreach ( (array) $record->get( 'fields' ) as $id => $field ) {
				$value           = is_array( $field ) ? ( $field['value'] ?? '' ) : $field;
				$fields[ (string) $id ] = is_array( $value ) ? implode( ', ', array_map( 'strval', $value ) ) : (string) $value;
			}

			$submission_id = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$wpdb->prefix}e_submissions WHERE element_id = %s AND created_at_gmt >= %s ORDER BY id DESC LIMIT 1",
					$element_id,
					gmdate( 'Y-m-d H:i:s', time() - 120 )
				)
			);
			$payload = $submission_id ? omni_crm_submission_payload( $submission_id ) : null;

			if ( ! $payload ) {
				// Submission storage disabled: use a stable content hash so retries stay idempotent.
				ksort( $fields );
				$post_id = isset( $_POST['queried_id'] ) ? absint( $_POST['queried_id'] ) : ( isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0 ); // phpcs:ignore WordPress.Security.NonceVerification
				$payload = array(
					'externalId'  => 'elementor:' . omni_crm_site_host() . ':hash:' . sha1( $element_id . '|' . wp_json_encode( $fields ) . '|' . gmdate( 'YmdHi' ) ),
					'form'        => (string) $record->get_form_settings( 'form_name' ),
					'page'        => $post_id ? get_the_title( $post_id ) : '',
					'site'        => omni_crm_site_host(),
					'submittedAt' => gmdate( 'Y-m-d\TH:i:s\Z' ),
					'fields'      => (object) $fields,
				);
			}
			omni_crm_deliver( $payload );
		} catch ( \Throwable $error ) {
			// Never break the visitor's form submission because the CRM is unreachable.
			error_log( '[omni-crm] delivery error: ' . $error->getMessage() );
		}
	},
	99
);

/* -------------------------------------------------------------------------
 * Admin page
 * ---------------------------------------------------------------------- */

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Omni CRM', 'Omni CRM', 'manage_options', 'omni-crm', 'omni_crm_admin_page' );
	}
);

add_action(
	'admin_post_omni_crm_save',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'omni-crm-connector' ) );
		}
		check_admin_referer( 'omni_crm_save' );
		$saved    = get_option( OMNI_CRM_OPTION, array() );
		$saved    = is_array( $saved ) ? $saved : array();
		$endpoint = esc_url_raw( trim( (string) wp_unslash( $_POST['endpoint'] ?? '' ) ) );
		$secret   = trim( (string) wp_unslash( $_POST['secret'] ?? '' ) );
		$saved['endpoint'] = $endpoint;
		if ( '' !== $secret ) {
			$saved['secret'] = sanitize_text_field( $secret );
		}
		update_option( OMNI_CRM_OPTION, $saved, false );
		if ( ! wp_next_scheduled( OMNI_CRM_CRON ) ) {
			wp_schedule_event( time() + 300, 'hourly', OMNI_CRM_CRON );
		}
		$notice = ( '' !== $secret && strlen( $secret ) < 32 ) ? 'short' : 'saved';
		wp_safe_redirect( add_query_arg( array( 'page' => 'omni-crm', 'notice' => $notice ), admin_url( 'options-general.php' ) ) );
		exit;
	}
);

add_action(
	'admin_post_omni_crm_test',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'omni-crm-connector' ) );
		}
		check_admin_referer( 'omni_crm_test' );
		// An empty "fields" object is rejected by the CRM with 400 after the signature check passes,
		// so 400 here proves the endpoint and secret are right without creating a lead.
		$result = omni_crm_send( array( 'externalId' => 'connection-test:' . omni_crm_site_host(), 'form' => 'Connection test', 'fields' => (object) array() ) );
		$state  = 400 === $result['status'] ? 'test-ok' : 'test-fail';
		set_transient( 'omni_crm_test_result', $result, 120 );
		wp_safe_redirect( add_query_arg( array( 'page' => 'omni-crm', 'notice' => $state ), admin_url( 'options-general.php' ) ) );
		exit;
	}
);

add_action(
	'admin_post_omni_crm_backfill',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'omni-crm-connector' ) );
		}
		check_admin_referer( 'omni_crm_backfill' );
		global $wpdb;
		$ids  = $wpdb->get_col( "SELECT id FROM {$wpdb->prefix}e_submissions WHERE status <> 'trash' ORDER BY id ASC LIMIT 500" );
		$sent = 0;
		$failed = 0;
		foreach ( $ids as $id ) {
			$payload = omni_crm_submission_payload( (int) $id );
			if ( ! $payload ) {
				continue;
			}
			$result = omni_crm_deliver( $payload );
			$result['ok'] ? $sent++ : $failed++;
		}
		set_transient( 'omni_crm_backfill_result', array( 'sent' => $sent, 'failed' => $failed ), 300 );
		wp_safe_redirect( add_query_arg( array( 'page' => 'omni-crm', 'notice' => 'backfill' ), admin_url( 'options-general.php' ) ) );
		exit;
	}
);

function omni_crm_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$settings = omni_crm_settings();
	$notice   = isset( $_GET['notice'] ) ? sanitize_key( wp_unslash( $_GET['notice'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	$queue    = get_option( OMNI_CRM_QUEUE, array() );
	$log      = get_option( OMNI_CRM_LOG, array() );
	global $wpdb;
	$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}e_submissions WHERE status <> 'trash'" );
	?>
	<div class="wrap">
		<h1>Omni CRM</h1>
		<p>Every Elementor form submission on this site is sent to the Omni CRM as a new lead. Failed deliveries are retried every hour.</p>
		<?php if ( 'saved' === $notice ) : ?>
			<div class="notice notice-success"><p>Settings saved.</p></div>
		<?php elseif ( 'short' === $notice ) : ?>
			<div class="notice notice-error"><p>The secret must be at least 32 characters. It was saved, but deliveries are paused until it is long enough.</p></div>
		<?php elseif ( 'test-ok' === $notice ) : ?>
			<div class="notice notice-success"><p>Connection works: the CRM accepted this site's signature.</p></div>
		<?php elseif ( 'test-fail' === $notice ) : ?>
			<?php $test = get_transient( 'omni_crm_test_result' ); ?>
			<div class="notice notice-error"><p>Connection failed<?php echo is_array( $test ) ? esc_html( sprintf( ' (HTTP %d%s)', $test['status'], $test['message'] ? ': ' . $test['message'] : '' ) ) : ''; ?>. Check the endpoint URL and that the secret matches CRM_WEBHOOK_SECRET on the CRM server.</p></div>
		<?php elseif ( 'backfill' === $notice ) : ?>
			<?php $backfill = get_transient( 'omni_crm_backfill_result' ); ?>
			<div class="notice notice-info"><p><?php echo esc_html( is_array( $backfill ) ? sprintf( '%d submission(s) delivered, %d failed. Submissions the CRM already had are not duplicated.', $backfill['sent'], $backfill['failed'] ) : 'Done.' ); ?></p></div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="omni_crm_save">
			<?php wp_nonce_field( 'omni_crm_save' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="omni-crm-endpoint">CRM webhook URL</label></th>
					<td>
						<input name="endpoint" id="omni-crm-endpoint" type="url" class="regular-text code" value="<?php echo esc_attr( $settings['endpoint'] ); ?>" placeholder="https://crm.omnidevelopment.co.uk/api/integrations/wordpress/lead" <?php disabled( defined( 'OMNI_CRM_ENDPOINT' ) ); ?>>
						<?php if ( defined( 'OMNI_CRM_ENDPOINT' ) ) : ?><p class="description">Set in wp-config.php (OMNI_CRM_ENDPOINT).</p><?php endif; ?>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="omni-crm-secret">Shared secret</label></th>
					<td>
						<input name="secret" id="omni-crm-secret" type="password" class="regular-text code" autocomplete="new-password" value="" placeholder="<?php echo esc_attr( $settings['secret'] ? 'Saved (' . strlen( $settings['secret'] ) . ' characters) — leave blank to keep' : 'Paste CRM_WEBHOOK_SECRET' ); ?>" <?php disabled( defined( 'OMNI_CRM_SECRET' ) ); ?>>
						<p class="description"><?php echo defined( 'OMNI_CRM_SECRET' ) ? 'Set in wp-config.php (OMNI_CRM_SECRET).' : 'Must match CRM_WEBHOOK_SECRET on the CRM server (32+ characters).'; ?></p>
					</td>
				</tr>
			</table>
			<?php submit_button( 'Save settings' ); ?>
		</form>

		<h2>Tools</h2>
		<p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
				<input type="hidden" name="action" value="omni_crm_test"><?php wp_nonce_field( 'omni_crm_test' ); ?>
				<?php submit_button( 'Test connection', 'secondary', 'submit', false, omni_crm_configured() ? array() : array( 'disabled' => 'disabled' ) ); ?>
			</form>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
				<input type="hidden" name="action" value="omni_crm_backfill"><?php wp_nonce_field( 'omni_crm_backfill' ); ?>
				<?php submit_button( sprintf( 'Send existing submissions (%d)', $total ), 'secondary', 'submit', false, omni_crm_configured() ? array() : array( 'disabled' => 'disabled' ) ); ?>
			</form>
		</p>
		<p>Waiting to retry: <strong><?php echo esc_html( (string) ( is_array( $queue ) ? count( $queue ) : 0 ) ); ?></strong></p>

		<h2>Recent deliveries</h2>
		<?php if ( ! is_array( $log ) || ! $log ) : ?>
			<p>No deliveries yet.</p>
		<?php else : ?>
			<table class="widefat striped">
				<thead><tr><th>When</th><th>Submission</th><th>Result</th><th>Details</th></tr></thead>
				<tbody>
				<?php foreach ( array_slice( $log, 0, 10 ) as $entry ) : ?>
					<tr>
						<td><?php echo esc_html( wp_date( 'j M Y H:i', (int) $entry['time'] ) ); ?></td>
						<td><code><?php echo esc_html( $entry['id'] ); ?></code></td>
						<td><?php echo $entry['ok'] ? '✅ Delivered' : '⚠️ Failed'; ?> <?php echo $entry['status'] ? esc_html( '(HTTP ' . $entry['status'] . ')' ) : ''; ?></td>
						<td><?php echo esc_html( $entry['message'] ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
	</div>
	<?php
}
