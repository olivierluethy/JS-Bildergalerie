/* Local Storage Key */
let key = 0;

window.onload = function exampleFunction() {
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        alert(`${key}: ${localStorage.getItem(key)}`);
    }
}

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

/* Add Image Function */
function addImage() {
    var img = document.createElement("img");
    img.src = document.getElementById("imgURL").value;
    console.log(img.href);
    var container = document.getElementById("imageGallery");
    container.appendChild(img);
    modal.style.display = "none";
    localStorage.setItem(key, img.src)
    alert(localStorage.getItem(key))
    key++;
}