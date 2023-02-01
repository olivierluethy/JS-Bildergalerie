// Variables
const modal = document.getElementById("myModal");
const btn = document.getElementById("myBtn");
const span = document.getElementsByClassName("close")[0];

// Modal 
btn.onclick = function() {
    modal.style.display = "block";
}

span.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// ToDo
document.addEventListener('DOMContentLoaded', init);

function init() {
    const button = document.getElementById('mehr');
    button.addEventListener('click', addToDo);
    const clearButton = document.getElementById('loeschen');
    clearButton.addEventListener('click', clearAll);
    const toDos = getToDos();
    for (const toDo of toDos) {
        const data = JSON.parse(localStorage.getItem(toDo));
        insertToDOM(toDo, data);
    }
}

function getToDos() {
    let toDos = JSON.parse(localStorage.getItem('toDos'));
    if (!toDos) {
        toDos = [];
        localStorage.setItem('toDos', JSON.stringify(toDos));
    }
    return toDos;
}

function addToDo() {
    const input = document.getElementById('eingabe').value;
    if (input !== '') {
        const date = new Date();
        const id = `toDo_${date.getTime()}`;
        const toDo = {
            'value': input
        };
        localStorage.setItem(id, JSON.stringify(toDo));
        const toDos = getToDos();
        toDos.push(id);
        localStorage.setItem('toDos', JSON.stringify(toDos));
        insertToDOM(id, toDo);
        document.getElementById('eingabe').value = '';
    } else {
        alert('Please enter a URL!');
    }
}

function deleteToDo(e) {
    const id = e.target.id;
    const toDos = getToDos();
    for (let i = 0; i < toDos.length; i++) {
        if (id === toDos[i]) {
            toDos.splice(i, 1);
        }
    }
    localStorage.removeItem(id);
    localStorage.setItem('toDos', JSON.stringify(toDos));
    removeFromDOM(id);
}

function insertToDOM(id, toDo) {
    const imageGallery = document.getElementById('imageGallery');
    const entry = document.createElement('img');
    entry.setAttribute('id', id);
    entry.src = toDo.value;
    entry.title = "Delete";
    entry.classList.add('animated','fadeIn')  // add an animation
    imageGallery.appendChild(entry);
    entry.addEventListener('click', deleteToDo);
}
