import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import amiriFontUrl from '../src/assets/fonts/Amiri-Regular.ttf';

export class PdfGenerator {
    /**
     * Initializes a new jsPDF instance with the Amiri font loaded for Urdu support.
     */
    // Branding Palette
    static readonly colors = {
        primary: [15, 23, 42],     // Slate 900
        secondary: [51, 65, 85],   // Slate 700
        accent: [79, 70, 229],     // Indigo 600
        success: [16, 185, 129],   // Emerald 500
        danger: [225, 29, 72],     // Rose 600
        text: [30, 41, 59],        // Slate 800
        textLight: [100, 116, 139],// Slate 500 
        bg: [248, 250, 252],       // Slate 50
        white: [255, 255, 255]
    };

    static async initPDF(): Promise<jsPDF> {
        const doc = new jsPDF();

        try {
            console.log("Initializing PDF with font URL:", amiriFontUrl);
            const response = await fetch(amiriFontUrl);
            if (!response.ok) throw new Error(`Failed to load font from ${amiriFontUrl}`);

            const fontBlob = await response.blob();
            const fontBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(fontBlob);
            });

            doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
            doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 400, 'Identity-H');
            doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold', 700, 'Identity-H');

            doc.setFont('Amiri', 'normal');
            return doc;
        } catch (error) {
            console.error("Error loading font:", error);
            throw error;
        }
    }

    static addHeader(doc: jsPDF, title: string, subtitle: string, period: string, isExpense?: boolean) {
        const width = doc.internal.pageSize.width;

        // 1. Top Bar Background (Dark Slate)
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, width, 40, 'F');

        // 2. Logo / Brand Name
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text("RDF", 20, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("Expenditure Management", 20, 26);

        // 3. Right Side: Report Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), width - 20, 18, { align: 'right' });

        // 4. Period / Subtitle
        if (period || subtitle) {
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
