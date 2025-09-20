import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export interface DocxGeneratorOptions {
  title: string;
  author: string;
  projectId: string;
  contentType: string;
  content: string;
}

/**
 * Convertit du contenu texte/markdown en document DOCX
 */
export const generateDocxBuffer = async (options: DocxGeneratorOptions): Promise<ArrayBuffer> => {
  const { title, author, projectId, contentType, content } = options;

  // Parser le contenu markdown basique
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  // Ajouter le titre principal
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // Métadonnées
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Généré par: ${author}`,
          size: 20,
          italics: true
        })
      ],
      spacing: { after: 200 }
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${new Date().toLocaleDateString('fr-FR')}`,
          size: 20,
          italics: true
        })
      ],
      spacing: { after: 200 }
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Type: ${contentType}`,
          size: 20,
          italics: true
        })
      ],
      spacing: { after: 400 }
    })
  );

  // Traiter le contenu ligne par ligne
  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      // Ligne vide = nouveau paragraphe
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // Détection des titres markdown
    if (trimmedLine.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace('### ', ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 200 }
        })
      );
    } else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 300 }
        })
      );
    } else if (trimmedLine.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.replace('# ', ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 500, after: 400 }
        })
      );
    }
    // Détection des listes
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.substring(2),
          bullet: { level: 0 },
          spacing: { after: 100 }
        })
      );
    }
    // Détection des listes numérotées
    else if (/^\d+\.\s/.test(trimmedLine)) {
      const text = trimmedLine.replace(/^\d+\.\s/, '');
      paragraphs.push(
        new Paragraph({
          text: text,
          numbering: {
            reference: "default-numbering",
            level: 0
          },
          spacing: { after: 100 }
        })
      );
    }
    // Paragraphe normal avec mise en forme
    else {
      const children: TextRun[] = [];

      // Gestion basique du bold et italic markdown
      let processedLine = trimmedLine;

      // Remplacer **text** par du bold
      const boldRegex = /\*\*(.*?)\*\*/g;
      const boldMatches = processedLine.matchAll(boldRegex);
      let lastIndex = 0;

      for (const match of boldMatches) {
        if (match.index !== undefined) {
          // Ajouter le texte avant le bold
          if (match.index > lastIndex) {
            children.push(new TextRun({
              text: processedLine.substring(lastIndex, match.index),
              size: 24
            }));
          }
          // Ajouter le texte en bold
          children.push(new TextRun({
            text: match[1],
            bold: true,
            size: 24
          }));
          lastIndex = match.index + match[0].length;
        }
      }

      // Ajouter le reste du texte
      if (lastIndex < processedLine.length) {
        children.push(new TextRun({
          text: processedLine.substring(lastIndex),
          size: 24
        }));
      }

      // Si pas de mise en forme, ajouter le texte normal
      if (children.length === 0) {
        children.push(new TextRun({
          text: trimmedLine,
          size: 24
        }));
      }

      paragraphs.push(
        new Paragraph({
          children,
          spacing: { after: 200 }
        })
      );
    }
  }

  // Ajouter un pied de page
  paragraphs.push(
    new Paragraph({
      text: '',
      spacing: { before: 800 }
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '---',
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Document généré automatiquement par l\'IA de l\'équipe',
          italics: true,
          size: 18,
          color: '666666'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 }
    })
  );

  // Créer le document
  const doc = new Document({
    creator: author,
    title: title,
    description: `Contenu généré par IA - ${contentType}`,
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });

  // Générer le buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer.buffer as ArrayBuffer;
};

/**
 * Convertit un buffer ArrayBuffer en Blob pour upload
 */
export const arrayBufferToBlob = (buffer: ArrayBuffer, mimeType: string = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'): Blob => {
  return new Blob([buffer], { type: mimeType });
};