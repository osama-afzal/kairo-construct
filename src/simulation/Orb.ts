export interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  neighbors?: Neighbor[];
}

export interface Neighbor {
  id: number;
  distance: number;
  dx: number;
  dy: number;
}
