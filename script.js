// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal 
btn.onclick = function() {
    modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


window.onload = init;

function init() {
    var button = document.getElementById('mehr');
    button.onclick = ToDoHinzufügen;
    var clearButton = document.getElementById('loeschen');
    clearButton.onclick = allesLöschen;
    var imageGalleryArray = HolEinträge();
    for (var i = 0; i < imageGalleryArray.length; i++) {
        var aufgabeNr = imageGalleryArray[i];
        var value = JSON.parse(localStorage[aufgabeNr]);
        insDOMschreiben(aufgabeNr, value);
    }
}

function HolEinträge() {
    var imageGalleryArray = localStorage.getItem('imageGalleryArray');
    if (!imageGalleryArray) {
        imageGalleryArray = [];
        localStorage.setItem('imageGalleryArray', JSON.stringify(imageGalleryArray));
    } else {
        imageGalleryArray = JSON.parse(imageGalleryArray);
    }
    return imageGalleryArray;
}

function ToDoHinzufügen() {
    var imageGalleryArray = HolEinträge();
    var value = document.getElementById('eingabe')
        .value;
    if (value != '') {
        var currentDate = new Date();
        var aufgabeNr = 'aufgabe_' + currentDate.getTime()
        var aufgabeText = {
            'value': value
        };
        localStorage.setItem(aufgabeNr, JSON.stringify(aufgabeText));
        imageGalleryArray.push(aufgabeNr);
        localStorage.setItem('imageGalleryArray', JSON.stringify(imageGalleryArray));
        insDOMschreiben(aufgabeNr, aufgabeText);
        document.getElementById('eingabe')
            .value = ' ';
    } else {
        alert('Bitte geben Sie ihre URL ein!');
    }
}

function toDoLöschen(e) {
    var aufgabeNr = e.target.id;
    var imageGalleryArray = HolEinträge();
    if (imageGalleryArray) {
        for (var i = 0; i < imageGalleryArray.length; i++) {
            if (aufgabeNr == imageGalleryArray[i]) {
                imageGalleryArray.splice(i, 1);
            }
        }
        localStorage.removeItem(aufgabeNr);
        localStorage.setItem('imageGalleryArray', JSON.stringify(imageGalleryArray));
        ausDOMentfernen(aufgabeNr);
    }
}

function insDOMschreiben(aufgabeNr, ItemObj) {
    var imageGallery = document.getElementById('imageGallery');
    var eintrag = document.createElement('img');
    eintrag.setAttribute('id', aufgabeNr);
    eintrag.src = ItemObj.value;
    eintrag.title = "Löschen";
    imageGallery.appendChild(eintrag);
    eintrag.onclick = toDoLöschen;
}

function ausDOMentfernen(aufgabeNr) {
    var eintrag = document.getElementById(aufgabeNr);
    eintrag.parentNode.removeChild(eintrag);
}

function allesLöschen() {
    localStorage.clear();
    var ItemList = document.getElementById('imageGallery');
    var imageGallery = ItemList.childNodes;
    for (var i = imageGallery.length - 1; i >= 0; i--) {
        ItemList.removeChild(imageGallery[i]);
    }
    var imageGalleryArray = HolEinträge();
}