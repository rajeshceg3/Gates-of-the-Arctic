export class PoissonDiskSampling {
  constructor(width, height, r, k = 30) {
    this.width = width;
    this.height = height;
    this.r = r; // Minimum distance between samples
    this.k = k; // Limit of samples to choose before rejection
    this.grid = [];
    this.active = [];
    this.cellSize = r / Math.sqrt(2);
    this.cols = Math.floor(width / this.cellSize);
    this.rows = Math.floor(height / this.cellSize);

    // Initialize grid with -1
    for (let i = 0; i < this.cols * this.rows; i++) {
      this.grid[i] = -1;
    }
  }

  fill() {
    const points = [];

    // Add first point randomly
    // If width/height are centered at 0 (e.g. -100 to 100), we should handle coordinate shift.
    // However, simplest is to generate 0..width, 0..height and shift afterwards.

    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    const p0 = { x, y };
    points.push(p0);
    this.active.push(p0);

    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    this.grid[col + row * this.cols] = 0; // Index of p0 in points array

    while (this.active.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.active.length);
      const p = this.active[randomIndex];
      let found = false;

      for (let i = 0; i < this.k; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.r + this.r; // Random radius between r and 2r
        const newX = p.x + Math.cos(angle) * dist;
        const newY = p.y + Math.sin(angle) * dist;

        if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
          const newCol = Math.floor(newX / this.cellSize);
          const newRow = Math.floor(newY / this.cellSize);

          if (newCol >= 0 && newCol < this.cols && newRow >= 0 && newRow < this.rows) {
             let ok = true;
             // Check neighbors
             for (let dx = -1; dx <= 1; dx++) {
               for (let dy = -1; dy <= 1; dy++) {
                 const neighborCol = newCol + dx;
                 const neighborRow = newRow + dy;
                 if (neighborCol >= 0 && neighborCol < this.cols && neighborRow >= 0 && neighborRow < this.rows) {
                   const neighborIndex = this.grid[neighborCol + neighborRow * this.cols];
                   if (neighborIndex !== -1) {
                     const neighbor = points[neighborIndex];
                     const d = Math.hypot(newX - neighbor.x, newY - neighbor.y);
                     if (d < this.r) {
                       ok = false;
                     }
                   }
                 }
               }
             }

             if (ok) {
               const newP = { x: newX, y: newY };
               points.push(newP);
               this.active.push(newP);
               this.grid[newCol + newRow * this.cols] = points.length - 1;
               found = true;
               break; // Found a valid point, break k loop
             }
          }
        }
      }

      if (!found) {
        this.active.splice(randomIndex, 1);
      }
    }
    return points;
  }
}
