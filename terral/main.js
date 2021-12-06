var w = window.innerWidth;
      var h = window.innerHeight;
      window.addEventListener("load", (event) => {
        fixHeights();
      });
      window.addEventListener("resize", (event) => {
        fixHeights();
      });
      function fixHeights() {
        // Width and Height of the window
        w = window.innerWidth;
        h = window.innerHeight;
        menu = document.getElementById("main_menu");
        // Initial heights for sections
        document.getElementById("cover").style.height = h + "px";
        document.getElementById("container").style.height = h + "px";
        for (i = 0; i < menu.getElementsByTagName("li").length; i++) {
            menu.getElementsByTagName("li")[i].getElementsByTagName("a")[0].removeAttribute("href")
            menu.getElementsByTagName("li")[i].setAttribute("scrollPart", i);
          }
        mobileLinks();
        // Responsive design
        if (w > 834) {
          document.getElementById("details").style.height = h + "px";
          document.getElementsByTagName("aside")[0].style.height = (h) + "px";
          document.getElementsByClassName("part")[0].style.minHeight = h + "px";
          document.getElementsByClassName("part")[1].style.minHeight = h + "px";
          document.getElementsByClassName("part")[2].style.minHeight = h + "px";
          document.getElementsByClassName("part")[3].style.minHeight = h + "px";
          // ---------------------------------
          // LI links
          // ---------------------------------
          for (i = 0; i < menu.getElementsByTagName("li").length; i++) {
            menu.getElementsByTagName("li")[i].onclick = function () {
                animateContent(this.getAttribute("scrollPart"),1)
            };
          }
        } else {
          document.getElementsByTagName("aside")[0].style.height = (h - 48) + "px";
          document.getElementById("details").style.height = h + "px";
          document.getElementsByClassName("part")[0].style.minHeight = h + "px";
          // ---------------------------------
          // LI links
          // ---------------------------------
          for (i = 0; i < menu.getElementsByTagName("li").length; i++) {
            menu.getElementsByTagName("li")[i].onclick = function () {
                animateContent(this.getAttribute("scrollPart"),0)
                menu.style.display = "none";
            };
          }
        }
      }
      function animateContent(i,v){
        parts = ["#part0","#part1","#part2","#part3","#part4"]
        target = ["#details","main"]
        if(i == 0 && v == 0){
            gsap.to(target, {duration: 1, scrollTo: 0, ease: "ease-inOut"});
        }
        else{
            gsap.to(target, {duration: 1, scrollTo: parts[i], ease: "ease-inOut"});
        }
       
      }
    
      function mobileLinks() {
        // ---------------------------------
        // Open menu
        // ---------------------------------
        document.getElementsByClassName("open_menu")[0].onclick = function () {
          menu.style.display = "flex";
          gsap.fromTo(
            "nav li, .close, .copyright",
            { opacity: 0, y: 33 },
            { opacity: 1, y: 0, duration: 2, stagger: 0.1, ease: "elastic" }
          );
        };
        // ---------------------------------
        // Close menu
        // ---------------------------------
        document.getElementsByClassName("close")[0].onclick = function () {
          menu.style.display = "none";
        };
        // ---------------------------------
        // Scroll Top
        // ---------------------------------
        document.getElementsByTagName("nav")[0].getElementsByTagName("h2")[0].getElementsByTagName("a")[0].onclick = function () {
            gsap.to("#container", {duration: 1, scrollTo: "#cover", ease: "ease-inOut"});
        };
        document.getElementsByTagName("button")[0].getElementsByTagName("a")[0].removeAttribute("href")
        document.getElementsByTagName("button")[0].onclick = function () {
            gsap.to("#container", {duration: 1, scrollTo: "#details", ease: "ease-inOut"});
        };
      }