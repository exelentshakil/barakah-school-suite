// FILE: src/lib/pdf-fonts.ts
import jsPDF from 'jspdf';

let bengaliFontLoaded = false;
let arabicFontLoaded = false;

export const loadBengaliFont = async (doc: jsPDF) => {
    if (bengaliFontLoaded) return true;

    try {
        const response = await fetch('/fonts/NotoSansBengali-Regular.ttf');
        const fontData = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(fontData);

        doc.addFileToVFS('NotoSansBengali.ttf', base64);
        doc.addFont('NotoSansBengali.ttf', 'NotoSansBengali', 'normal');
        bengaliFontLoaded = true;
        return true;
    } catch (error) {
        console.error('Failed to load Bengali font:', error);
        return false;
    }
};

export const loadArabicFont = async (doc: jsPDF) => {
    if (arabicFontLoaded) return true;

    try {
        const response = await fetch('/fonts/NotoNaskhArabic-Regular.ttf');
        const fontData = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(fontData);

        doc.addFileToVFS('NotoNaskhArabic.ttf', base64);
        doc.addFont('NotoNaskhArabic.ttf', 'NotoNaskhArabic', 'normal');
        arabicFontLoaded = true;
        return true;
    } catch (error) {
        console.error('Failed to load Arabic font:', error);
        return false;
    }
};

export const setupPDFWithFonts = async (doc: jsPDF): Promise<jsPDF> => {
    await Promise.all([
        loadBengaliFont(doc),
        loadArabicFont(doc)
    ]);
    return doc;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export const isBengali = (text: string): boolean => {
    return /[\u0980-\u09FF]/.test(text);
};

export const isArabic = (text: string): boolean => {
    return /[\u0600-\u06FF]/.test(text);
};

// Split text into words to handle complex shaping
function splitBengaliText(text: string): string[] {
    return text.split(' ');
}

export const renderText = async (doc: jsPDF, text: string, x: number, y: number, options?: any) => {
    if (!text) return;

    if (isBengali(text)) {
        await loadBengaliFont(doc);
        doc.setFont('NotoSansBengali', 'normal');

        // For Bengali, render word by word to improve rendering
        const words = splitBengaliText(text);
        let currentX = x;
        const wordSpacing = 2;

        words.forEach((word, index) => {
            doc.text(word, currentX, y, options);
            const wordWidth = doc.getTextWidth(word);
            currentX += wordWidth + wordSpacing;

            if (index < words.length - 1) {
                doc.text(' ', currentX, y);
                currentX += doc.getTextWidth(' ');
            }
        });
    } else if (isArabic(text)) {
        await loadArabicFont(doc);
        doc.setFont('NotoNaskhArabic', 'normal');
        doc.text(text, x, y, options);
    } else {
        doc.setFont('helvetica', 'normal');
        doc.text(text, x, y, options);
    }
};