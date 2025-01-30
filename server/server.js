const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const sharp = require('sharp');

const app = express();
const port = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'uploads');
const dataFile = path.join(__dirname, 'data.json');
const templatePath = path.join(__dirname, 'templates', 'template.docx');

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

app.post('/opslaan', upload.array('images'), (req, res) => {
    const data = JSON.parse(req.body.data);
    data.images = req.files.map(file => file.filename);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    res.send('Formulier opgeslagen! Nu kan je het formulier exporteren naar een Word document.');
});

app.get('/exporteer-word', async (req, res) => {
    try {
        if (!fs.existsSync(templatePath)) {
            return res.status(500).send('Templatebestand niet gevonden!');
        }

        const data = JSON.parse(fs.readFileSync(dataFile));
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            modules: [new ImageModule({
                centered: true,
                getImage: async (tagValue) => {
                    try {
                        const imagePath = path.resolve(uploadDir, tagValue);
                        if (fs.existsSync(imagePath)) {
                            const rotatedImageBuffer = await sharp(imagePath).rotate().toBuffer();
                            return rotatedImageBuffer;
                        } else {
                            return fs.readFileSync(path.join(__dirname, 'public', 'placeholder.png'));
                        }
                    } catch (error) {
                        return fs.readFileSync(path.join(__dirname, 'public', 'placeholder.png'));
                    }
                },
                getSize: () => [200, 150]
            })]
        });

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
                afbeelding: data.images[index] || 'placeholder.png'
            }))
        };

        doc.resolveData(templateData).then(() => {
            doc.render();
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });
            const outputPath = path.join(__dirname, 'inspectie.docx');
            fs.writeFileSync(outputPath, buffer);
            res.download(outputPath);
        }).catch(error => {
            res.status(500).send('Fout bij exporteren naar Word');
        });

    } catch (error) {
        res.status(500).send('Fout bij exporteren naar Word');
    }
});

app.get('/', (req, res) => {
    res.send('Welkom bij mijn Inspectie App!');
});

app.listen(port, () => {
    console.log(`🚀 Server draait op http://localhost:${port}`);
});
