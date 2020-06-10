var circle = document.getElementById("circle");
var repetitions = document.getElementById("repetition");
var instructions = document.getElementById("instructions");
var timer = document.getElementById("timer");
var congrats = document.getElementById("bs_congrats");
var about = document.getElementById("bs_about");
var congratsClose = document.getElementById("close");
var aClose = document.getElementById("aClose");
var cTimer = 4;
var counter = 1
var repetition = 1
var darkTheme = true;
var tInhale = 5;
var tHold = 8;
var tExhale = 9;
var tNegativeCounter = tInhale;
directions = [
    "Tap<br/>circle to<br/>start",
    "Inhale<br/>from your<br/>nose",
    "Hold<br/>your<br/>breath",
    "Exhale<br/>from your<br/>mouth"
];
var stopAnimation = false;
var secCounter

// 
// Ready function... when the DOM is loaded
//
var callback = function () {
    circle.onclick = function () {
        if (stopAnimation == true) {
            resetAnimation();
            setTimeout(() => {
                stopAnimation = false
            }, 1000);
        } else {
            starAnimation()
            secCounter = setInterval(animateGraphic, 1000);
            setTimeout(() => {
                stopAnimation = true
            }, 1000);
        }
    }
    congratsClose.onclick = function () {
        congrats.classList.remove("active");
    }
    aClose.onclick = function () {
        about.classList.remove("active");
    }
    repetitions.onclick = function () {
        about.classList.add("active");
    }
};
// 
// Animate Graphic
//
function animateGraphic(i) {
    if (repetition < 5) {
        counter++;
        timer.innerHTML = "0" +  cTimer--
        if (counter == 4) {
            cTimer = 7;
            tNegativeCounter = 8
            changeInstructions(2);
        }
        if (counter == 11) {
            cTimer = 8;
            tNegativeCounter = 9
            changeInstructions(3);
        }
        if (counter == 19) {
            counter = 0;
            cTimer = 4;
            tNegativeCounter = 5
            repetition++
            repetitions.innerHTML = "0" + (5 - repetition);
            changeInstructions(1);
        }
        
    } else {
        congratulations()
    }
}
// 
// Change instruction
//
function changeInstructions(i) {
    setTimeout(function () {
        instructions.innerHTML = directions[i];
    }, 1000)
}
//
// Start Animation
//
function starAnimation() {
    timer.innerHTML = "0" +  cTimer--
    instructions.innerHTML = directions[1];
    circle.classList.add("animate");
    repetitions.innerHTML = "0" + (5 - repetition);
}
// 
// Reset Animation
//
function resetAnimation() {
    var cTimer = 4;
    var counter = 1
    var repetition = 0
    instructions.innerHTML = directions[0];
    timer.innerHTML = "00";
    repetitions.innerHTML = "00";
    clearInterval(secCounter);
    circle.classList.remove("animate");
}
function congratulations(){
    clearInterval(secCounter);
    congrats.classList.add("active");
    var cTimer = 4;
    var counter = 1
    var repetition = 0
    instructions.innerHTML = directions[0];
    timer.innerHTML = "00";
    repetitions.innerHTML = "00";
    circle.classList.remove("animate");
    confetti.speed = 0
    confetti.start(3000); 
}
//
// Change Theme
//
function changeTheme(){
    if (darkTheme) {
        cc = setTimeout(function() {
            document.getElementsByTagName("html")[0].classList.add("day");
            clearTimeout(cc);
            darkTheme = false;
        }, 100);
    } else {
        cc = setTimeout(function() {
            document.getElementsByTagName("html")[0].classList.remove("day");
            clearTimeout(cc);
            darkTheme = true;
        }, 100);

    }
}
document.addEventListener("keydown", function(event) {
    if (event.code == "KeyN") {
        changeTheme();
    }
})
// 
// Document ready/complete
//
if (
    document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
    callback();
} else {
    document.addEventListener("DOMContentLoaded", callback);
}