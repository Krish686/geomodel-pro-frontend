// -----------------------------
// DEFAULT BLOCKS
// -----------------------------

const DEFAULT_BLOCKS = [

{ xMin:1500,xMax:2500,zMin:250,zMax:500,density:2.1 },
{ xMin:4000,xMax:5000,zMin:500,zMax:750,density:3.1 },
{ xMin:3500,xMax:4000,zMin:100,zMax:300,density:2.7 },
{ xMin:4000,xMax:4500,zMin:100,zMax:300,density:3.1 },
{ xMin:4500,xMax:5000,zMin:100,zMax:300,density:1.6 },
{ xMin:1000,xMax:1500,zMin:700,zMax:900,density:3.1 },
{ xMin:1500,xMax:2000,zMin:700,zMax:900,density:1.6 },
{ xMin:2000,xMax:2500,zMin:700,zMax:900,density:2.7 }

];


let blocks = [];

let canvas, ctx;

let dragging = false;
let dragIndex = null;

let offsetX = 0;
let offsetY = 0;


// -----------------------------
// INITIALIZATION
// -----------------------------

document.addEventListener("DOMContentLoaded",()=>{

canvas = document.getElementById("modelCanvas");
ctx = canvas.getContext("2d");

resizeCanvas();

window.addEventListener("resize",resizeCanvas);

canvas.addEventListener("mousedown",startDrag);
canvas.addEventListener("mousemove",dragBlock);
canvas.addEventListener("mouseup",stopDrag);
canvas.addEventListener("mouseleave",stopDrag);

const saved = localStorage.getItem("geoBlocks");

if(saved){

blocks = JSON.parse(saved);

}else{

resetToDefault();

}

renderTable();

});


// -----------------------------
// CANVAS SIZE
// -----------------------------

function resizeCanvas(){

const width = canvas.parentElement.clientWidth

canvas.width = width
canvas.height = width*0.45

drawPreview()

}


// -----------------------------
// COLOR SCALE
// -----------------------------

function getDensityColor(d){

if(d < 2.0) return "#fde725";
if(d < 2.5) return "#5ec962";
if(d < 2.9) return "#21918c";
if(d < 3.2) return "#3b528b";

return "#440154";

}


// -----------------------------
// DRAW MODEL
// -----------------------------

function drawPreview(){

ctx.clearRect(0,0,canvas.width,canvas.height);

const modelLength = Number(document.getElementById("modelLength").value)||6000;
const modelDepth = Number(document.getElementById("modelDepth").value)||1000;

const scaleX = canvas.width/modelLength;
const scaleY = canvas.height/modelDepth;


// background

ctx.fillStyle="#eef2f7";
ctx.fillRect(0,0,canvas.width,canvas.height);


// grid

ctx.strokeStyle="#d0d7e2";

for(let x=0;x<=modelLength;x+=1000){

ctx.beginPath();
ctx.moveTo(x*scaleX,0);
ctx.lineTo(x*scaleX,canvas.height);
ctx.stroke();

}

for(let z=0;z<=modelDepth;z+=200){

ctx.beginPath();
ctx.moveTo(0,z*scaleY);
ctx.lineTo(canvas.width,z*scaleY);
ctx.stroke();

}


// draw blocks

blocks.forEach((b,i)=>{

const x=b.xMin*scaleX;
const y=b.zMin*scaleY;

const w=(b.xMax-b.xMin)*scaleX;
const h=(b.zMax-b.zMin)*scaleY;

ctx.fillStyle=getDensityColor(b.density);
ctx.fillRect(x,y,w,h);

ctx.strokeStyle="#333";
ctx.strokeRect(x,y,w,h);

ctx.fillStyle="#fff";
ctx.font="bold 12px sans-serif";
ctx.fillText(`B${i+1}`,x+5,y+15);

});

}


// -----------------------------
// DRAGGING
// -----------------------------

function startDrag(e){

const rect = canvas.getBoundingClientRect();

const mouseX = e.clientX - rect.left;
const mouseY = e.clientY - rect.top;

const scaleX = canvas.width/(Number(modelLength.value)||6000);
const scaleY = canvas.height/(Number(modelDepth.value)||1000);

blocks.forEach((b,i)=>{

const x=b.xMin*scaleX;
const y=b.zMin*scaleY;

const w=(b.xMax-b.xMin)*scaleX;
const h=(b.zMax-b.zMin)*scaleY;

if(mouseX>x && mouseX<x+w && mouseY>y && mouseY<y+h){

dragging=true;
dragIndex=i;

offsetX = mouseX-x;
offsetY = mouseY-y;

}

});

}


function dragBlock(e){

if(!dragging) return;

const rect = canvas.getBoundingClientRect();

const mouseX = e.clientX - rect.left;
const mouseY = e.clientY - rect.top;

const modelLength = Number(document.getElementById("modelLength").value)||6000;
const modelDepth = Number(document.getElementById("modelDepth").value)||1000;

const scaleX = canvas.width/modelLength;
const scaleY = canvas.height/modelDepth;

const b = blocks[dragIndex];

const width = b.xMax - b.xMin;
const height = b.zMax - b.zMin;

let newX = (mouseX-offsetX)/scaleX;
let newZ = (mouseY-offsetY)/scaleY;

newX = Math.max(0,Math.min(newX,modelLength-width));
newZ = Math.max(0,Math.min(newZ,modelDepth-height));

b.xMin=newX;
b.xMax=newX+width;

b.zMin=newZ;
b.zMax=newZ+height;

drawPreview();
renderTable();

}


function stopDrag(){

dragging=false;
dragIndex=null;

}


// -----------------------------
// TABLE
// -----------------------------

function renderTable(){

const tbody=document.getElementById("table-body");

tbody.innerHTML="";

blocks.forEach((b,i)=>{

const tr=document.createElement("tr");

tr.innerHTML=`

<td>Block ${i+1}</td>

<td><input type="number" value="${b.xMin}" onchange="updateBlock(${i},'xMin',this.value)"></td>

<td><input type="number" value="${b.xMax}" onchange="updateBlock(${i},'xMax',this.value)"></td>

<td><input type="number" value="${b.zMin}" onchange="updateBlock(${i},'zMin',this.value)"></td>

<td><input type="number" value="${b.zMax}" onchange="updateBlock(${i},'zMax',this.value)"></td>

<td><input type="number" step="0.1" value="${b.density}" onchange="updateBlock(${i},'density',this.value)"></td>

<td><button onclick="deleteBlock(${i})">Delete</button></td>

`;

tbody.appendChild(tr);

});

drawPreview();

}


// -----------------------------
// BLOCK MANAGEMENT
// -----------------------------

function updateBlock(i,key,value){

blocks[i][key]=Number(value);

drawPreview();

}


function addBlock(){

blocks.push({

xMin:500,
xMax:1000,
zMin:200,
zMax:400,
density:2.8

});

renderTable();

}


function deleteBlock(i){

blocks.splice(i,1);

renderTable();

}


function resetToDefault(){

blocks=JSON.parse(JSON.stringify(DEFAULT_BLOCKS));

renderTable();

}

