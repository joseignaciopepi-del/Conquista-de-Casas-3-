const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Calcula la distancia toroidal en el tablero 10x10.
 */
function getToroidalOffset(r1, c1, r2, c2) {
  let dr = r2 - r1; // Positivo = Abajo (S), Negativo = Arriba (N)
  let dc = c2 - c1; // Positivo = Derecha (E), Negativo = Izquierda (O)

  if (Math.abs(dr) > 5) dr = dr > 0 ? dr - 10 : dr + 10;
  if (Math.abs(dc) > 5) dc = dc > 0 ? dc - 10 : dc + 10;

  const distance = Math.abs(dr) + Math.abs(dc);
  return { distance, dr, dc };
}

/**
 * Selecciona la dirección ortogonal (N, S, E, O).
 */
function selectDirection(dr, dc) {
  if (Math.abs(dr) >= Math.abs(dc) && dr !== 0) {
    return dr > 0 ? 'S' : 'N';
  } else if (dc !== 0) {
    return dc > 0 ? 'E' : 'O';
  }
  return 'N';
}

/**
 * Estrategia para elegir el movimiento de cada ficha propia hacia la casa neutral más cercana.
 */
function chooseMove(state) {
  const { jugador, tablero } = state;
  const response = {};
  const neutralHouses = [];
  const myPieces = [];

  // Escanear el tablero 10x10
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = tablero[r][c];
      if (cell === 'N') {
        neutralHouses.push({ r, c });
      } else if (cell && cell.startsWith(jugador)) {
        myPieces.push({ id: cell, r, c });
      }
    }
  }

  const fallbackDirections = ['N', 'E', 'S', 'O'];

  myPieces.forEach((piece, index) => {
    if (neutralHouses.length > 0) {
      let closestHouse = neutralHouses[0];
      let minOffset = getToroidalOffset(piece.r, piece.c, closestHouse.r, closestHouse.c);

      for (let i = 1; i < neutralHouses.length; i++) {
        const house = neutralHouses[i];
        const offset = getToroidalOffset(piece.r, piece.c, house.r, house.c);
        if (offset.distance < minOffset.distance) {
          closestHouse = house;
          minOffset = offset;
        }
      }
      response[piece.id] = selectDirection(minOffset.dr, minOffset.dc);
    } else {
      response[piece.id] = fallbackDirections[index % fallbackDirections.length];
    }
  });

  return response;
}

// Ruta POST requerida por el Árbitro
app.post('/move', (req, res) => {
  try {
    const state = req.body;
    const move = chooseMove(state);
    res.json(move);
  } catch (error) {
    res.status(400).json({ error: 'Estado inválido o mal formateado' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot escuchando en http://localhost:${PORT}/move`);
});
