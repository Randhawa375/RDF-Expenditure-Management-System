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
            console.log("Initializing PDF with font URL:", amiriFontUrl);

            // Load the Urdu font
            const response = await fetch(amiriFontUrl);
            if (!response.ok) throw new Error(`Failed to load font from ${amiriFontUrl}: ${response.statusText}`);

            const fontBlob = await response.blob();
            console.log("Font blob loaded, size:", fontBlob.size);

            // Validation: Ensure the downloaded file is actually a font (approx > 10KB)
            if (fontBlob.size < 10000) {
                throw new Error(`Downloaded font file is too small (${fontBlob.size} bytes). Likely a 404 or corrupted file.`);
            }

            // Convert Blob to Base64 string using FileReader
            const fontBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(fontBlob);
            });

            // Add font to VFS and register it
            doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);

            // Register with Identity-H to support UTF-8/Urdu glyphs correctly
            // Args: fileName, fontName, fontStyle, fontWeight, encoding
            doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 400, 'Identity-H');

            doc.setFont('Amiri'); // Set as default at document level

            // Verify font is added
            if (!doc.getFontList()['Amiri']) {
                console.warn("Font Amiri not found in font list after addition!");
            }

            console.log("Font 'Amiri' registered with Identity-H.");

        } catch (error) {
            console.error("Error loading font:", error);
            // Re-throw so consumers know initialization failed
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
