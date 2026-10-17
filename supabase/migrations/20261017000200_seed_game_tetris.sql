-- SPEC 06: Tetris como segundo juego real del catálogo.

insert into public.games (id, title, short, long, cat, cover, color)
values (
  'tetris',
  'TETRIS',
  'Encaja las piezas, limpia líneas y no te quedes sin espacio.',
  'Las piezas caen sobre un tablero de 10×20. Muévelas, rótalas y encájalas para completar líneas. Cada 10 líneas sube el nivel y la caída se acelera. Ojo con la tuerca: una pieza gris con hueco en el centro.',
  'PUZZLE',
  'cover-tetris',
  'magenta'
);
