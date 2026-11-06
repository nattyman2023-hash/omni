<?php

declare(strict_types=1);

/*
 * Dependency-free PDF 1.4 writer for CRM quotes and invoices.
 *
 * Uses the 14 standard fonts (Helvetica and Helvetica-Bold, WinAnsiEncoding) so no font files are
 * embedded and "£" renders in every viewer. Coordinates passed to the drawing methods are measured
 * from the TOP-left corner of an A4 page, in points; they are flipped to PDF space on output.
 */

final class CrmPdf
{
    public const WIDTH = 595.28;
    public const HEIGHT = 841.89;

    /** @var list<string> content stream per page */
    private array $pages = [];
    private int $current = -1;

    /** Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32..126. */
    private const REGULAR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
    private const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
    /** A few WinAnsi characters above 126 that appear in business text (others default to 556). */
    private const EXTRA = [0x80 => 556, 0x91 => 222, 0x92 => 222, 0x93 => 333, 0x94 => 333, 0x95 => 350, 0x96 => 556, 0x97 => 1000, 0xA0 => 278, 0xA3 => 556, 0xA9 => 737, 0xB7 => 278];

    public function addPage(): int
    {
        $this->pages[] = '';
        $this->current = count($this->pages) - 1;
        return $this->current;
    }

    public function setPage(int $index): void
    {
        $this->current = $index;
    }

    public function pageCount(): int
    {
        return count($this->pages);
    }

    /** UTF-8 → Windows-1252 bytes (unmappable characters become "?"). */
    public static function encode(string $text): string
    {
        $text = str_replace(["\r", "\n", "\t"], ' ', $text);
        if (function_exists('mb_convert_encoding')) {
            $converted = @mb_convert_encoding($text, 'Windows-1252', 'UTF-8');
            if (is_string($converted)) {
                return $converted;
            }
        }
        if (function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'Windows-1252//TRANSLIT', $text);
            if (is_string($converted)) {
                return $converted;
            }
        }
        return (string) preg_replace('/[^\x20-\x7E]/', '?', $text);
    }

    public function width(string $text, float $size, bool $bold = false): float
    {
        $table = $bold ? self::BOLD : self::REGULAR;
        $units = 0;
        $bytes = self::encode($text);
        $length = strlen($bytes);
        for ($i = 0; $i < $length; $i++) {
            $code = ord($bytes[$i]);
            $units += ($code >= 32 && $code <= 126) ? $table[$code - 32] : (self::EXTRA[$code] ?? 556);
        }
        return $units * $size / 1000;
    }

    /** Splits text into lines no wider than $width (honours newlines; very long words are broken). */
    public function wrap(string $text, float $width, float $size, bool $bold = false): array
    {
        $lines = [];
        foreach (preg_split('/\r\n|\r|\n/', $text) ?: [''] as $paragraph) {
            $words = preg_split('/[ \t]+/', trim($paragraph)) ?: [];
            $line = '';
            foreach ($words as $word) {
                if ($word === '') {
                    continue;
                }
                $candidate = $line === '' ? $word : $line . ' ' . $word;
                if ($this->width($candidate, $size, $bold) <= $width) {
                    $line = $candidate;
                    continue;
                }
                if ($line !== '') {
                    $lines[] = $line;
                }
                // Break a single word that is wider than the column.
                while ($this->width($word, $size, $bold) > $width && mb_strlen($word) > 1) {
                    $cut = mb_strlen($word) - 1;
                    while ($cut > 1 && $this->width(mb_substr($word, 0, $cut), $size, $bold) > $width) {
                        $cut--;
                    }
                    $lines[] = mb_substr($word, 0, $cut);
                    $word = mb_substr($word, $cut);
                }
                $line = $word;
            }
            $lines[] = $line;
        }
        return $lines;
    }

    private static function number(float $value): string
    {
        $formatted = rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
        return $formatted === '-0' ? '0' : $formatted;
    }

    private function append(string $operators): void
    {
        if ($this->current < 0) {
            $this->addPage();
        }
        $this->pages[$this->current] .= $operators . "\n";
    }

    /** @param string $align left|right|center — x is the left edge, right edge or centre respectively. */
    public function text(float $x, float $y, string $text, float $size = 10, bool $bold = false, string $align = 'left', float $gray = 0.0): void
    {
        if ($text === '') {
            return;
        }
        $width = $this->width($text, $size, $bold);
        if ($align === 'right') {
            $x -= $width;
        } elseif ($align === 'center') {
            $x -= $width / 2;
        }
        $escaped = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], self::encode($text));
        $this->append(sprintf('BT %s g /%s %s Tf %s %s Td (%s) Tj ET', self::number($gray), $bold ? 'F2' : 'F1', self::number($size), self::number($x), self::number(self::HEIGHT - $y), $escaped));
    }

    public function line(float $x1, float $y1, float $x2, float $y2, float $width = 0.5, float $gray = 0.0): void
    {
        $this->append(sprintf('%s G %s w %s %s m %s %s l S', self::number($gray), self::number($width), self::number($x1), self::number(self::HEIGHT - $y1), self::number($x2), self::number(self::HEIGHT - $y2)));
    }

    /** Filled (and optionally stroked) rectangle; $y is the top edge. */
    public function rect(float $x, float $y, float $width, float $height, float $fillGray = 0.95, ?float $strokeGray = null): void
    {
        $operator = $strokeGray === null ? 'f' : 'B';
        $stroke = $strokeGray === null ? '' : self::number($strokeGray) . ' G 0.5 w ';
        $this->append(sprintf('%s g %s%s %s %s %s re %s', self::number($fillGray), $stroke, self::number($x), self::number(self::HEIGHT - $y - $height), self::number($width), self::number($height), $operator));
    }

    public function output(string $title = ''): string
    {
        if (!$this->pages) {
            $this->addPage();
        }
        $objects = [];
        $pageCount = count($this->pages);
        // 1 catalog, 2 page tree, 3/4 fonts, 5 info, then a page + content stream pair per page.
        $kids = [];
        for ($i = 0; $i < $pageCount; $i++) {
            $kids[] = (6 + $i * 2) . ' 0 R';
        }
        $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[2] = '<< /Type /Pages /Kids [' . implode(' ', $kids) . '] /Count ' . $pageCount . ' >>';
        $objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
        $objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
        $info = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], self::encode($title));
        $objects[5] = '<< /Title (' . $info . ') /Producer (Omni CRM) /CreationDate (D:' . gmdate('YmdHis') . "Z) >>";
        foreach ($this->pages as $index => $content) {
            $pageId = 6 + $index * 2;
            $objects[$pageId] = sprintf('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %s %s] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents %d 0 R >>', self::number(self::WIDTH), self::number(self::HEIGHT), $pageId + 1);
            $objects[$pageId + 1] = '<< /Length ' . strlen($content) . " >>\nstream\n" . $content . "\nendstream";
        }
        ksort($objects);
        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];
        foreach ($objects as $id => $body) {
            $offsets[$id] = strlen($pdf);
            $pdf .= $id . " 0 obj\n" . $body . "\nendobj\n";
        }
        $xref = strlen($pdf);
        $size = count($objects) + 1;
        $pdf .= "xref\n0 " . $size . "\n0000000000 65535 f \n";
        for ($id = 1; $id < $size; $id++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$id]);
        }
        $pdf .= "trailer\n<< /Size " . $size . " /Root 1 0 R /Info 5 0 R >>\nstartxref\n" . $xref . "\n%%EOF\n";
        return $pdf;
    }
}

function crmPdfMoney(int $pence): string
{
    return '£' . number_format($pence / 100, 2, '.', ',');
}

function crmPdfQuantity(float $quantity): string
{
    return rtrim(rtrim(number_format($quantity, 2, '.', ','), '0'), '.');
}

/**
 * Renders a quote or invoice.
 *
 * $doc keys: kind ('quote'|'invoice'), reference, title, company {name,address,email,phone,vatNumber,
 * companyNumber,website}, customer {name,company,address (may be multi-line),email,phone}, meta (list of [label, value]), items (list of LineItem arrays),
 * subtotalPence, vatRatePercent, vatPence, totalPence, notes, terms, payment (list of [label, value]
 * or null), signature ({name, signedAt, ip} or null), stamp (short status text or '').
 */
function crmRenderSalesPdf(array $doc): string
{
    $pdf = new CrmPdf();
    $left = 50.0;
    $right = CrmPdf::WIDTH - 50.0;
    $bottom = CrmPdf::HEIGHT - 70.0;
    $isQuote = $doc['kind'] === 'quote';
    $company = $doc['company'];
    $customer = $doc['customer'];

    $pdf->addPage();
    // Company block (left) and document heading (right).
    $y = 62.0;
    $pdf->text($left, $y, (string) $company['name'], 16, true);
    $leftY = $y + 16;
    foreach ($pdf->wrap((string) $company['address'], 260, 9) as $line) {
        $pdf->text($left, $leftY, $line, 9, false, 'left', 0.25);
        $leftY += 12;
    }
    $contact = implode('  ·  ', array_filter([(string) $company['email'], (string) $company['phone']], fn ($part) => $part !== ''));
    $website = (string) preg_replace('#^https?://#', '', rtrim((string) ($company['website'] ?? ''), '/'));
    $registration = implode('  ·  ', array_filter([
        ($company['companyNumber'] ?? '') !== '' ? 'Company no. ' . $company['companyNumber'] : '',
        ($company['vatNumber'] ?? '') !== '' ? 'VAT no. ' . $company['vatNumber'] : '',
    ], fn ($part) => $part !== ''));
    foreach ([$contact, $website, $registration] as $line) {
        if ($line !== '') {
            $pdf->text($left, $leftY, $line, 9, false, 'left', 0.25);
            $leftY += 12;
        }
    }
    $pdf->text($right, $y + 2, $isQuote ? 'QUOTE' : 'INVOICE', 22, true, 'right');
    $rightY = $y + 20;
    $pdf->text($right, $rightY, (string) $doc['reference'], 11, true, 'right');
    $rightY += 15;
    foreach ($doc['meta'] as [$label, $value]) {
        if ((string) $value === '') {
            continue;
        }
        $pdf->text($right, $rightY, $label . ': ' . $value, 9, false, 'right', 0.25);
        $rightY += 12;
    }
    if (($doc['stamp'] ?? '') !== '') {
        $pdf->text($right, $rightY + 4, (string) $doc['stamp'], 10, true, 'right', 0.35);
        $rightY += 16;
    }
    $y = max($leftY, $rightY) + 10;
    $pdf->line($left, $y, $right, $y, 0.75, 0.75);
    $y += 22;

    // Customer.
    $pdf->text($left, $y, $isQuote ? 'PREPARED FOR' : 'INVOICE TO', 8, true, 'left', 0.4);
    $y += 14;
    $pdf->text($left, $y, (string) $customer['name'], 11, true);
    $y += 14;
    $customerLines = array_merge(
        ($customer['company'] ?? '') !== '' ? [(string) $customer['company']] : [],
        trim((string) ($customer['address'] ?? '')) !== '' ? $pdf->wrap((string) $customer['address'], 300, 9.5) : [],
        [(string) ($customer['email'] ?? ''), (string) ($customer['phone'] ?? '')]
    );
    foreach ($customerLines as $line) {
        if ($line !== '') {
            $pdf->text($left, $y, $line, 9.5, false, 'left', 0.2);
            $y += 12.5;
        }
    }
    $y += 10;
    if ((string) $doc['title'] !== '') {
        foreach ($pdf->wrap((string) $doc['title'], $right - $left, 12, true) as $line) {
            $pdf->text($left, $y, $line, 12, true);
            $y += 16;
        }
        $y += 4;
    }

    $columns = ['desc' => $left + 8, 'qty' => 375.0, 'unit' => 460.0, 'amount' => $right - 8];
    $descWidth = 375.0 - 40 - ($left + 8);
    $tableHeader = function () use ($pdf, $left, $right, $columns, &$y): void {
        $pdf->rect($left, $y, $right - $left, 20, 0.92);
        $pdf->text($columns['desc'], $y + 13.5, 'Description', 9, true);
        $pdf->text($columns['qty'], $y + 13.5, 'Qty', 9, true, 'right');
        $pdf->text($columns['unit'], $y + 13.5, 'Unit price', 9, true, 'right');
        $pdf->text($columns['amount'], $y + 13.5, 'Amount', 9, true, 'right');
        $y += 20;
    };
    $newPage = function () use ($pdf, $left, $doc, &$y): void {
        $pdf->addPage();
        $y = 50.0;
        $pdf->text($left, $y, $doc['reference'] . ' (continued)', 9, true, 'left', 0.4);
        $y += 18;
    };
    $ensure = function (float $needed) use ($bottom, $newPage, &$y): bool {
        if ($y + $needed > $bottom) {
            $newPage();
            return true;
        }
        return false;
    };

    $ensure(60);
    $tableHeader();
    foreach ($doc['items'] as $item) {
        $lines = $pdf->wrap((string) $item['description'], $descWidth, 9.5);
        $height = count($lines) * 12.5 + 9;
        if ($ensure($height)) {
            $tableHeader();
        }
        $rowTop = $y;
        $lineY = $rowTop + 14;
        foreach ($lines as $line) {
            $pdf->text($columns['desc'], $lineY, $line, 9.5);
            $lineY += 12.5;
        }
        $pdf->text($columns['qty'], $rowTop + 14, crmPdfQuantity((float) $item['quantity']), 9.5, false, 'right');
        $pdf->text($columns['unit'], $rowTop + 14, crmPdfMoney((int) $item['unitPricePence']), 9.5, false, 'right');
        $pdf->text($columns['amount'], $rowTop + 14, crmPdfMoney((int) $item['amountPence']), 9.5, false, 'right');
        $y = $rowTop + $height;
        $pdf->line($left, $y, $right, $y, 0.5, 0.85);
    }

    // Totals.
    $ensure(70);
    $y += 18;
    $labelX = $columns['unit'];
    $vatPercent = $doc['vatRatePercent'];
    $pdf->text($labelX, $y, 'Subtotal', 9.5, false, 'right', 0.25);
    $pdf->text($columns['amount'], $y, crmPdfMoney((int) $doc['subtotalPence']), 9.5, false, 'right');
    $y += 15;
    $pdf->text($labelX, $y, 'VAT (' . rtrim(rtrim(number_format((float) $vatPercent, 2, '.', ''), '0'), '.') . '%)', 9.5, false, 'right', 0.25);
    $pdf->text($columns['amount'], $y, crmPdfMoney((int) $doc['vatPence']), 9.5, false, 'right');
    $y += 8;
    $pdf->line($labelX - 70, $y, $right, $y, 0.75, 0.5);
    $y += 15;
    $pdf->text($labelX, $y, $isQuote ? 'Total' : 'Total due', 11, true, 'right');
    $pdf->text($columns['amount'], $y, crmPdfMoney((int) $doc['totalPence']), 11, true, 'right');
    $y += 26;

    $paragraph = function (string $heading, string $text, float $size) use ($pdf, $left, $right, $ensure, &$y): void {
        if (trim($text) === '') {
            return;
        }
        $ensure(40);
        $pdf->text($left, $y, $heading, 10, true);
        $y += 15;
        foreach ($pdf->wrap($text, $right - $left, $size) as $line) {
            $ensure($size + 4);
            $pdf->text($left, $y, $line, $size, false, 'left', 0.15);
            $y += $size + 3.5;
        }
        $y += 10;
    };

    $paragraph('Notes', (string) ($doc['notes'] ?? ''), 9.5);

    if (!$isQuote && is_array($doc['payment'] ?? null)) {
        $rows = array_values(array_filter($doc['payment'], fn ($row) => (string) $row[1] !== ''));
        $boxHeight = 30 + count($rows) * 14;
        $ensure($boxHeight + 10);
        $pdf->rect($left, $y, $right - $left, $boxHeight, 0.96, 0.8);
        $pdf->text($left + 12, $y + 18, 'How to pay', 10, true);
        $rowY = $y + 34;
        foreach ($rows as [$label, $value]) {
            $pdf->text($left + 12, $rowY, $label, 9.5, false, 'left', 0.3);
            $pdf->text($left + 150, $rowY, (string) $value, 9.5, true);
            $rowY += 14;
        }
        $y += $boxHeight + 16;
    }

    if ($isQuote) {
        $paragraph('Terms and conditions', (string) ($doc['terms'] ?? ''), 8.5);
        $signature = $doc['signature'] ?? null;
        $ensure(96);
        $boxHeight = 84.0;
        $pdf->rect($left, $y, $right - $left, $boxHeight, 0.97, 0.75);
        if (is_array($signature)) {
            $pdf->text($left + 12, $y + 18, 'Accepted and signed electronically', 10, true);
            $pdf->text($left + 12, $y + 36, 'Name: ' . $signature['name'], 9.5);
            $pdf->text($left + 12, $y + 50, 'Date: ' . $signature['signedAt'], 9.5);
            $pdf->text($left + 12, $y + 64, 'Signed electronically from IP address ' . $signature['ip'], 9, false, 'left', 0.3);
        } else {
            $pdf->text($left + 12, $y + 18, 'Acceptance', 10, true);
            $pdf->text($left + 12, $y + 36, 'To accept this quote, use the secure signing link in the email we sent you,', 9.5, false, 'left', 0.25);
            $pdf->text($left + 12, $y + 50, 'or contact us and we will send a new link.', 9.5, false, 'left', 0.25);
        }
        $y += $boxHeight + 10;
    }

    // Footer on every page.
    $count = $pdf->pageCount();
    $footer = trim((string) $company['name'] . ' · ' . (string) $company['address'], ' ·');
    for ($index = 0; $index < $count; $index++) {
        $pdf->setPage($index);
        $pdf->line($left, CrmPdf::HEIGHT - 45, $right, CrmPdf::HEIGHT - 45, 0.5, 0.8);
        $pdf->text($left, CrmPdf::HEIGHT - 32, $footer, 8, false, 'left', 0.45);
        $pdf->text($right, CrmPdf::HEIGHT - 32, 'Page ' . ($index + 1) . ' of ' . $count, 8, false, 'right', 0.45);
    }
    return $pdf->output(($isQuote ? 'Quote ' : 'Invoice ') . $doc['reference']);
}
