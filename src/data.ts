export const testSketch = 
`

s.setup = ()=>{
    s.createCanvas(400,400);
    console.log(e.get("hi"))
}
s.draw = ()=>{
    s.background(0);
    s.fill(255);
    s.text(e.get("hi"),... ( e.get("hi","pos") ?? vec(10,10) ))
    try{
        for(let i = 0; i < 10; i++){
        for(let j = 0 ; j< 10 ; j++){
            s.fill( ... (e.get("colGrid",i,j,"color") ?? [255]))
            let pos = e.get("colGrid",i,j) ?? vec2(0,0);
            s.rect( pos.x + 20 + i*20, pos.y + 100 + j*20 ,10,10)
        }
        }
    }catch(e){
        console.log(e)
    }
}

`

export const juliaSetScript = `let angle = 0;

// Maximum number of iterations for each point on the complex plane
const maxiterations = 100;

// Colors to be used for each possible iteration count
const colorsRed = [];
const colorsGreen = [];
const colorsBlue = [];

s.setup = ()=>{
  s.pixelDensity(1);
  s.createCanvas(640, 360);
  s.colorMode(s.HSB, 1);

  // Create the colors to be used for each possible iteration count
  for (let n = 0; n < maxiterations; n++) {
    // Gosh, we could make fancy colors here if we wanted
    let hu = s.sqrt(n / maxiterations);
    let col = s.color(hu, 255, 150);
    colorsRed[n] = s.red(col);
    colorsGreen[n] = s.green(col);
    colorsBlue[n] = s.blue(col);
  }
}

s.draw = ()=>{
  // let ca = map(mouseX, 0, width, -1, 1); //-0.70176;
  // let cb = map(mouseY, 0, height, -1, 1); //-0.3842;

  let ca = s.cos(angle * 3.213); //sin(angle);
  let cb = s.sin(angle);

  angle += 0.02;

  s.background(255);

  // Establish a range of values on the complex plane
  // A different range will allow us to "zoom" in or out on the fractal

  // It all starts with the width, try higher or lower values
  //let w = abs(sin(angle)) * 5;
  let w = 5;
  let h = (w * s.height) / s.width;

  // Start at negative half the width and height
  let xmin = -w / 2;
  let ymin = -h / 2;

  // Make sure we can write to the pixels[] array.
  // Only need to do this once since we don't do any other drawing.
  s.loadPixels();

  // x goes from xmin to xmax
  let xmax = xmin + w;
  // y goes from ymin to ymax
  let ymax = ymin + h;

  // Calculate amount we increment x,y for each pixel
  let dx = (xmax - xmin) / s.width;
  let dy = (ymax - ymin) / s.height;

  // Start y
  let y = ymin;
  for (let j = 0; j < s.height; j++) {
    // Start x
    let x = xmin;
    for (let i = 0; i < s.width; i++) {
      // Now we test, as we iterate z = z^2 + cm does z tend towards infinity?
      let a = x;
      let b = y;
      let n = 0;
      while (n < maxiterations) {
        let aa = a * a;
        let bb = b * b;
        // Infinity in our finite world is simple, let's just consider it 16
        if (aa + bb > 4.0) {
          break; // Bail
        }
        let twoab = 2.0 * a * b;
        a = aa - bb + ca;
        b = twoab + cb;
        n++;
      }

      // We color each pixel based on how long it takes to get to infinity
      // If we never got there, let's pick the color black
      let pix = (i + j * s.width) * 4;
      if (n == maxiterations) {
        s.pixels[pix + 0] = 0;
        s.pixels[pix + 1] = 0;
        s.pixels[pix + 2] = 0;
      } else {
        // Otherwise, use the colors that we made in setup()
        s.pixels[pix + 0] = colorsRed[n];
        s.pixels[pix + 1] = colorsGreen[n];
        s.pixels[pix + 2] = colorsBlue[n];
      }
      x += dx;
    }
    y += dy;
  }
  s.updatePixels();
}`