import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import amiriFontUrl from '../src/assets/fonts/Amiri-Regular.ttf';

export class PdfGenerator {
    /**
     * Initializes a new jsPDF instance with the Amiri font loaded for Urdu support.
     */
    static async initPDF(): Promise<jsPDF> {
        const doc = new jsPDF();

        try {
            // Load the Urdu font
            // Use the imported URL which Vite will resolve correctly in both dev and build
            const response = await fetch(amiriFontUrl);
            if (!response.ok) throw new Error('Failed to load font');

            const fontBuffer = await response.arrayBuffer();
            // Convert ArrayBuffer to Base64 string
            const fontBase64 = btoa(
                new Uint8Array(fontBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            // Add font to VFS and register it
            doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
            doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H'); // Identity-H is CRITICAL for Urdu/Arabic
            doc.setFont('Amiri'); // Set as default

            // Enable RTL support if needed by specific text calls, but usually just the font is enough for characters
            // (doc as any).setR2L(true); // Uncomment if strict RTL direction is needed globally

        } catch (error) {
            console.error("Error loading font:", error);
            // CRITICAL: Re-throw to prevent using a PDF without the correct font (which leads to Mojibake)
            throw error;
        }

        return doc;
    }

    /**
     * Adds the standard branding header to the PDF.
     */
    static addHeader(doc: jsPDF, title: string, subtitle: string, dateInfo: string, isExpense: boolean = true) {
        const timestamp = new Date().toLocaleString();

        // Top Premium Branding
        // Blue for general/income, Dark Blue for expense (or customize as needed based on UI)
        // Actually using the colors from Reports.tsx:
        // Header background
        doc.setFillColor(15, 23, 42); // Slate-900 like
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold'); // Keep English title in Helvetica for style
        doc.text('RDF EXPENDITURE', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // Using Amiri for subtitle if it needs Urdu, otherwise Helvetica
        doc.text(title.toUpperCase(), 20, 33); // e.g. "MONTHLY FINANCIAL STATEMENT"

        // If subtitle is Urdu, switch font temporarily
        // doc.setFont('Amiri'); 
        // doc.text(subtitle, 20, 38); 

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(dateInfo.toUpperCase(), 190, 25, { align: 'right' });
        doc.text(`GENERATED: ${timestamp}`, 190, 31, { align: 'right' });

        // Reset to Urdu font for body
        doc.setFont('Amiri');
    }

    static addFooter(doc: jsPDF) {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        }
    }
}
