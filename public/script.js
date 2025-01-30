document.addEventListener('DOMContentLoaded', function () {
    const sectieContainer = document.getElementById('secties');
    const voegSectieToeBtn = document.getElementById('voegSectieToe');
    const sectieTeller = document.createElement('div');
    sectieTeller.id = 'sectieTeller';
    document.body.appendChild(sectieTeller);

    const navigatieBalk = document.createElement('div');
    navigatieBalk.id = 'navigatieBalk';
    navigatieBalk.innerHTML = `
        <button id="vorigeSectie">Vorige</button>
        <button id="volgendeSectie">Volgende</button>
    `;
    document.body.appendChild(navigatieBalk);

    let secties = [];
    let huidigeIndex = -1;

    function updateSectieTeller() {
        sectieTeller.innerText = `Sectie ${huidigeIndex + 1} van ${secties.length}`;
    }

    function toonSectie(index) {
        secties.forEach((sectie, i) => {
            sectie.style.display = i === index ? 'block' : 'none';
        });
        huidigeIndex = index;
        updateSectieTeller();
    }

    function verwijderSectie(index) {
        if (confirm('Weet je zeker dat je deze sectie wilt verwijderen?')) {
            sectieContainer.removeChild(secties[index]);
            secties.splice(index, 1);
            huidigeIndex = Math.max(0, huidigeIndex - 1);
            toonSectie(huidigeIndex);
        }
    }

    function toonAfbeeldingPreview(input, previewContainer) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewContainer.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            previewContainer.innerHTML = '';
        }
    }

    voegSectieToeBtn.addEventListener('click', function () {
        const nieuweSectie = document.createElement('div');
        nieuweSectie.classList.add('sectie');
        nieuweSectie.innerHTML = `
            <h3>Sectie ${secties.length + 1}</h3>
            <label>Foto: 
                <input type="file" accept="image/*" class="foto" required>
                <div class="foto-preview"></div>
            </label>
            <label>Bevindingen: 
                <textarea class="bevindingen"></textarea>
            </label>
            <label>Actie: 
                <textarea class="actie"></textarea>
            </label>
            <label>Door: 
                <input type="text" class="door">
            </label>
            <label>Urgentie: 
                <input type="text" class="urgentie">
            </label>
            <label>Ernst: 
                <input type="text" class="ernst">
            </label>
            <label>Omvang: 
                <input type="text" class="omvang">
            </label>
            <label>Intensiteit: 
                <input type="text" class="intensiteit">
            </label>
            <label>Conditie: 
                <input type="text" class="conditie">
            </label>
            <button class="verwijderSectie">Verwijder</button>
        `;

        const fotoInput = nieuweSectie.querySelector('.foto');
        const fotoPreview = nieuweSectie.querySelector('.foto-preview');

        fotoPreview.innerHTML = '';

        fotoInput.addEventListener('change', function () {
            toonAfbeeldingPreview(fotoInput, fotoPreview);
        });

        nieuweSectie.querySelector('.verwijderSectie').addEventListener('click', () => {
            verwijderSectie(secties.indexOf(nieuweSectie));
        });

        sectieContainer.appendChild(nieuweSectie);
        secties.push(nieuweSectie);
        toonSectie(secties.length - 1);
    });

    document.getElementById('vorigeSectie').addEventListener('click', function () {
        if (huidigeIndex > 0) {
            toonSectie(huidigeIndex - 1);
        }
    });

    document.getElementById('volgendeSectie').addEventListener('click', function () {
        if (huidigeIndex < secties.length - 1) {
            toonSectie(huidigeIndex + 1);
        }
    });

    document.getElementById('opslaanFormulier').addEventListener('click', async function () {
        const sectiesData = document.querySelectorAll('#secties .sectie');
        const formData = new FormData();
        const data = { secties: [] };

        sectiesData.forEach((sectie, index) => {
            const bevindingen = sectie.querySelector('.bevindingen').value;
            const actie = sectie.querySelector('.actie').value;
            const door = sectie.querySelector('.door').value;
            const urgentie = sectie.querySelector('.urgentie').value;
            const ernst = sectie.querySelector('.ernst').value;
            const omvang = sectie.querySelector('.omvang').value;
            const intensiteit = sectie.querySelector('.intensiteit').value;
            const conditie = sectie.querySelector('.conditie').value;
            const fotoInput = sectie.querySelector('.foto');

            data.secties.push({ bevindingen, actie, door, urgentie, ernst, omvang, intensiteit, conditie });

            if (fotoInput.files.length > 0) {
                formData.append(`images`, fotoInput.files[0]);
            }
        });

        formData.append('data', JSON.stringify(data));

        const response = await fetch('/opslaan', {
            method: 'POST',
            body: formData
        });

        alert(await response.text());
    });

    document.getElementById('exporteerWord').addEventListener('click', function () {
        const sectiesData = document.querySelectorAll('#secties .sectie');
        let alleSectiesHebbenAfbeelding = true;

        sectiesData.forEach((sectie) => {
            const fotoInput = sectie.querySelector('.foto');
            if (fotoInput.files.length === 0) {
                alleSectiesHebbenAfbeelding = false;
            }
        });

        if (alleSectiesHebbenAfbeelding) {
            window.location.href = '/exporteer-word';
        } else {
            alert('Upload voor elke sectie een afbeelding voordat je exporteert naar Word.');
        }
    });
});
