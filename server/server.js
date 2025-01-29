const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun, ImageRun } = require('docx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');

const app = express();
const port = process.env.PORT || 3000; // Gebruik de poort die Render specificeert

const uploadDir = path.join(__dirname, 'uploads');

const dataFile = path.join(__dirname, 'data.json');
const templatePath = path.join(__dirname, 'templates', 'template.docx');

// ✅ Controleer of noodzakelijke bestanden bestaan
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ secties: [] }, null, 2));

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ✅ **Opslaan van formuliergegevens**
app.post('/opslaan', upload.array('images'), (req, res) => {
    const data = JSON.parse(req.body.data);
    data.images = req.files.map(file => file.filename);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    res.send('Formulier opgeslagen!');
});

// ✅ **Exporteer naar PDF**
app.get('/exporteer-pdf', async (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(dataFile));
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        let y = 750;

        page.drawText("Inspectieformulier", { x: 50, y, size: 20, font, color: rgb(0, 0, 0) });
        y -= 30;

        for (let index = 0; index < data.secties.length; index++) {
            const sectie = data.secties[index];

            page.drawText(`Sectie ${index + 1}`, { x: 50, y, size: 16, font });
            y -= 20;
            page.drawText(`Urgentie: ${sectie.urgentie}`, { x: 50, y, size: 12, font });
            page.drawText(`Ernst: ${sectie.ernst}`, { x: 250, y, size: 12, font });
            y -= 20;
            page.drawText(`Omvang: ${sectie.omvang}`, { x: 50, y, size: 12, font });
            page.drawText(`Intensiteit: ${sectie.intensiteit}`, { x: 250, y, size: 12, font });
            y -= 20;
            page.drawText(`Conditie: ${sectie.conditie}`, { x: 50, y, size: 12, font });
            y -= 20;
            page.drawText(`Bevindingen: ${sectie.bevindingen}`, { x: 50, y, size: 12, font });
            y -= 20;
            page.drawText(`Actie: ${sectie.actie}`, { x: 50, y, size: 12, font });
            page.drawText(`Door: ${sectie.door}`, { x: 250, y, size: 12, font });
            y -= 20;

            if (data.images[index]) {
                const imgPath = path.join(uploadDir, data.images[index]);
                if (fs.existsSync(imgPath)) {
                    const imgBytes = fs.readFileSync(imgPath);
                    const img = await pdfDoc.embedPng(imgBytes);
                    page.drawImage(img, { x: 50, y: y - 100, width: 150, height: 150 });
                    y -= 170;
                }
            }
            y -= 20;
        }

        const pdfBytes = await pdfDoc.save();
        const pdfPath = 'inspectie.pdf';
        fs.writeFileSync(pdfPath, pdfBytes);
        res.download(pdfPath);
    } catch (error) {
        console.error('Fout bij exporteren naar PDF:', error);
        res.status(500).send('Fout bij exporteren naar PDF');
    }
});

// ✅ **Exporteer naar Word met template en afbeeldingen**
// ✅ Exporteer naar Word met template en afbeeldingen
const sharp = require('sharp');

// ✅ Exporteer naar Word met template en afbeeldingen
app.get('/exporteer-word', async (req, res) => {
    try {
        if (!fs.existsSync(templatePath)) {
            return res.status(500).send('Templatebestand niet gevonden!');
        }

        // ✅ Laad opgeslagen gegevens
        const data = JSON.parse(fs.readFileSync(dataFile));

        // ✅ Laad Word-template
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        // ✅ Initialiseer Docxtemplater correct
        const doc = new Docxtemplater(zip, {
            modules: [new ImageModule({
                centered: true,
                getImage: async (tagValue) => {
                    try {
                        const imagePath = path.resolve(uploadDir, tagValue); // Zorg ervoor dat het pad klopt
                        console.log("📸 Laden afbeelding:", imagePath);

                        if (fs.existsSync(imagePath)) {
                            // Gebruik sharp om de afbeelding te roteren
                            const rotatedImageBuffer = await sharp(imagePath)
                                .rotate() // Draai de afbeelding rechtop
                                .toBuffer();
                            console.log("✅ Afbeelding succesvol geroteerd en geladen!");
                            return rotatedImageBuffer; // Retourneer als buffer (nodig voor docxtemplater)
                        } else {
                            console.warn(`⚠️ Afbeelding niet gevonden: ${imagePath}`);
                            return fs.readFileSync(path.join(__dirname, 'public', 'placeholder.png'));
                        }
                    } catch (error) {
                        console.error("❌ Fout bij laden afbeelding:", error);
                        return fs.readFileSync(path.join(__dirname, 'public', 'placeholder.png'));
                    }
                },
                getSize: () => [200, 150] // Statische grootte (verplicht in gratis versie)
            })]
        });

        // ✅ Data object opstellen met afbeeldingen
        const templateData = {
            inspectie_titel: "Inspectieformulier",
            secties: data.secties.map((sectie, index) => ({
                nummer: index + 1,
                urgentie: sectie.urgentie,
                ernst: sectie.ernst,
                omvang: sectie.omvang,
                intensiteit: sectie.intensiteit,
                conditie: sectie.conditie,
                bevindingen: sectie.bevindingen,
                actie: sectie.actie,
                door: sectie.door,
                afbeelding: data.images[index] || 'placeholder.png' // Gebruik de bestandsnaam, niet het volledige pad
            }))
        };

        console.log("Template data:", templateData);

        // ✅ Vul het template in
        doc.resolveData(templateData).then(() => {
            doc.render();
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });
            const outputPath = path.join(__dirname, 'inspectie.docx');
            fs.writeFileSync(outputPath, buffer);
            res.download(outputPath);
        }).catch(error => {
            console.error('❌ Fout bij exporteren naar Word:', error);
            res.status(500).send('Fout bij exporteren naar Word');
        });

    } catch (error) {
        console.error('❌ Fout bij exporteren naar Word:', error);
        res.status(500).send('Fout bij exporteren naar Word');
    }
});

// ✅ **Start de server**
app.listen(port, () => {
    console.log(`🚀 Server draait op http://localhost:${port}`);
});