console.log("Parent Page - Sketchfab VR Viewer (Scene Movement Option) Version: 21")
let api
let nodesGlobal
const margin = Math.cos(45 * Math.PI / 180); // ~0.966
const UP = [0, 0, 1];
let countMovementTrigger = 0;
const thresholdMovementTrigger = 5;

let prevBtn;
let toggleUpOrDownSceneMovement = true;


// --- Toggle button ---
const toggleBtnSceneMovementDirection = document.getElementById("directionToggle");
toggleBtnSceneMovementDirection.addEventListener("click", () => toggleSceneMovementDirection());

function toggleSceneMovementDirection(){
    toggleUpOrDownSceneMovement = !toggleUpOrDownSceneMovement;
    toggleBtnSceneMovementDirection.classList.toggle("active", toggleUpOrDownSceneMovement);
    toggleBtnSceneMovementDirection.textContent = toggleUpOrDownSceneMovement ? "Scene Movement Direction: Up" : "Scene Movement Direction: Down";
}


const slider = document.getElementById("heightSlider");
const heightValue = document.getElementById("heightValue");
const minVerticalStep = 0.01;   // smallest value
const maxVerticalStep = 500;   // largest value
const sliderRange = 100;
slider.min = 0;
slider.max = sliderRange;
slider.step = 1;
slider.value = 50;

let verticalStep;
processSliderInput()
slider.addEventListener("input", processSliderInput);

function processSliderInput(){
    verticalStep = sliderValueToVerticalStep(slider.value);
    heightValue.textContent = verticalStep.toFixed(2);
}

function sliderValueToVerticalStep(sliderValue){
    let ratio = maxVerticalStep/minVerticalStep
    let growthFactor = Math.pow(ratio, 1/sliderRange);
    let verticalStepValue = Math.pow(growthFactor, sliderValue) * minVerticalStep
    return verticalStepValue
}

window.addEventListener("message", event => {

    if (event.source !== window)
        return;

    if (event.data?.type === "SKETCHFAB_ROLL_DEBUG") {
        console.log(
            "🔥 RECEIVED FROM PAGE.JS:",
            event.data.values
        );
    }
});
//let cameraTimer = null;
//let savedPos = null;
/*function lowerCameraToFloorDelayed(delay, btn){
        if (cameraTimer){
            return
        }
         btn.classList.add("pressed");
        api.getCameraLookAt((err, camera) =>
          {
            cameraTimer = setTimeout(() => lowerCameraToFloor(btn, err, camera), delay * 1000)
          })

} */
function setAboveFloorHeight(height, btn){
    prevBtn.classList.remove("pressed");

    aboveFloorHeight = height
    btn.classList.add("pressed");
    prevBtn = btn
}

function normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]);
    return [v[0]/len, v[1]/len, v[2]/len];
}
function dotProduct(vec1, vec2){
    return vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2]
}
function startCheckingCameraLoweringThreshold()
{
    setInterval(() => api.getCameraLookAt(checkTarget), 100)
}



function checkTarget(err, camera){
    const ray = [
        camera.target[0] - camera.position[0],
        camera.target[1] - camera.position[1],
        camera.target[2] - camera.position[2]
    ];
    let normRay = normalize(ray)
    let dot = dotProduct(UP, normRay)
    if (dot >= margin){
        countMovementTrigger ++
        if (countMovementTrigger >= thresholdMovementTrigger){
            moveTheScene(camera)
        }
    }else{
        if (countMovementTrigger > 0){
            toggleSceneMovementDirection()
        }
        countMovementTrigger = 0
    }


}

function moveTheScene(camera){

    let previousPos = camera.position
    let newVerticalPos = previousPos[2] + verticalStep * (toggleUpOrDownSceneMovement ? -1 : 1)
    api.setCameraLookAt([previousPos[0], previousPos[1], newVerticalPos], [0, 0, 0], 0, function(err) {
        if (!err) {
            window.console.log('Camera moved');
        }
    });
    //btn.classList.remove("pressed");

    // cameraTimer = null
}

function extractUid(url) {
    // Match the 32-char model UID at the end of a Sketchfab URL
    const match = url.match(/([a-zA-Z0-9]{32})(?:\?.*)?$/);
    return match ? match[1] : null;
}
function startApiFunc(apiInstance){
    api = apiInstance
    //const func = addEventListenerFunc(api) -->
    api.start()
    startCheckingCameraLoweringThreshold()
}
/* function addEventListenerFunc(api){

       const func = getNodeMapFunc(api)
       return function (){

           api.addEventListener("viewerready", function(){
               func()
           })
       }
 }
 function getNodeMapFunc(api){
      const func = translate(api)
      return function (){
          api.getNodeMap(func)
      }
 }

 function translate(api){
     return function(err, nodes)
     {

           startCameraAnimation()
         nodesGlobal = nodes
         if (!err) {      // root node id
             api.translate(0, [0, 0, 2]); // lift whole scene by +1.6 meters (Y up)
         }

     }
 } */

function init(){
    let collection = document.getElementsByClassName("delay-btn");
    prevBtn = collection[0]
    //setAboveFloorHeight(0, prevBtn)
}

function loadModel()
{

    const url = document.getElementById("url").value.trim();
    const uid = extractUid(url);
    if (!uid) {
        alert("Invalid Sketchfab URL");
        return;
    }
    const iframe = document.createElement("iframe");
    iframe.src = "https://sketchfab.com/models/" + uid + "/embed?autostart=1";
    iframe.setAttribute("allow", "autoplay; fullscreen; xr-spatial-tracking");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("mozallowfullscreen", "true");
    iframe.setAttribute("webkitallowfullscreen", "true");

    // Boolean or feature-policy attributes
    iframe.setAttribute("execution-while-out-of-viewport", "");
    iframe.setAttribute("execution-while-not-rendered", "");
    iframe.setAttribute("web-share", "");
    //iframe.width = "100%";
    // iframe.height = "100%";
    iframe.frameBorder = "0";
    const container = document.getElementById("sketchfab-embed-wrapper");
    container.innerHTML = "";
    container.appendChild(iframe);
    const client = new Sketchfab(iframe);
    client.init(uid,
        {success: startApiFunc,
            error: function() { console.error("API init failed")}
        }
    )
}
window.onload = init
