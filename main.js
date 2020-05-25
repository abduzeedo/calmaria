// 
// Ready function... when the DOM is loaded
//
var callback = function () {
    
};
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