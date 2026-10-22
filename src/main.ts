const canvas = document.querySelector<HTMLCanvasElement>("#canvas1")!
const ctx = canvas.getContext('2d')!

const player = { x: 100, y: 100, size: 20 }
let speed: number = 2;

// Assigning the keys
const keys = new Set<string>()

addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))

function update() {
    if (keys.has('a')) {
        player.x -= speed
        console.log("right")
    } 

    if (keys.has('d')) {
        player.x += speed
        console.log("left")
    } 

    if (keys.has('w')) {
        player.y -= speed
        console.log("up")
    } 

    if (keys.has('s')) {
        player.y += speed
        console.log("down")
    } 

}
function draw() {
    ctx.fillStyle = '#e3c98a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#7a4a2a'
    ctx.fillRect(player.x, player.y, player.size, player.size)
}

function loop() {
    update()
    draw()
    requestAnimationFrame(loop)
}

loop()