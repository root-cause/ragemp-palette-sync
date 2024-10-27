const NUM_PALETTES = 4;
const DEFAULT_COLOR = 0xFFFFFF;

const g_dumpster = new Uint32Array(mp.config.maxplayers * NUM_PALETTES);

function isBitSet(num, position) {
    return (num & (1 << position)) !== 0;
}

function setPaletteColorInternal(playerId, paletteIndex, red, green, blue) {
    if (!Number.isInteger(paletteIndex) || paletteIndex < 0 || paletteIndex >= NUM_PALETTES) {
        throw new Error(`'paletteIndex' must be an integer between 0 and ${NUM_PALETTES - 1}`);
    } else if (!Number.isInteger(red) || red < 0 || red > 255) {
        throw new Error("'red' must be an integer between 0 and 255");
    } else if (!Number.isInteger(green) || green < 0 || green > 255) {
        throw new Error("'green' must be an integer between 0 and 255");
    } else if (!Number.isInteger(blue) || blue < 0 || blue > 255) {
        throw new Error("'blue' must be an integer between 0 and 255");
    }

    const colorIndex = (playerId * NUM_PALETTES) + paletteIndex;
    g_dumpster[colorIndex] = (red << 16) | (green << 8) | blue;
}

function serializePaletteColors(playerId) {
    let paletteBits = 0;
    let bufferSize = Uint8Array.BYTES_PER_ELEMENT;

    // first pass - update paletteBits based on set colors and calculate required buffer size
    for (let paletteIndex = 0, colorIndex = playerId * NUM_PALETTES; paletteIndex < NUM_PALETTES; paletteIndex++, colorIndex++) {
        if (g_dumpster[colorIndex] === DEFAULT_COLOR) {
            continue;
        }

        paletteBits |= (1 << paletteIndex); // set the bit for the palette index
        bufferSize += Uint8Array.BYTES_PER_ELEMENT * 3; // using 3 uint8 per color to store red, green and blue
    }

    const buffer = new ArrayBuffer(bufferSize);
    const writer = new DataView(buffer);
    let writeOffset = 0;

    // write palette bits
    writer.setUint8(writeOffset++, paletteBits);

    // no bits were set, skip the second pass
    if (paletteBits === 0) {
        return buffer;
    }

    // second pass - write colors
    for (let paletteIndex = 0, colorIndex = playerId * NUM_PALETTES; paletteIndex < NUM_PALETTES; paletteIndex++, colorIndex++) {
        if (!isBitSet(paletteBits, paletteIndex)) {
            continue;
        }

        const color = g_dumpster[colorIndex];
        writer.setUint8(writeOffset++, (color >> 16) & 0xFF); // red
        writer.setUint8(writeOffset++, (color >> 8) & 0xFF); // green
        writer.setUint8(writeOffset++, color & 0xFF); // blue
    }

    return buffer;
}

// Player functions
/**
 * Sets the specified head blend palette color for the player. **Make sure `player.setCustomization` is called beforehand to avoid issues.**
 * @param {number} paletteIndex 
 * @param {number} red 
 * @param {number} green 
 * @param {number} blue 
 * @throws If `paletteIndex` is less than 0 or higher than 3.
 * @throws If `red`, `green` or `blue` is not an integer between 0 to 255.
 */
mp.Player.prototype.setHeadBlendPaletteColor = function(paletteIndex, red, green, blue) {
    setPaletteColorInternal(this.id, paletteIndex, red, green, blue);
    this.setVariable("_paletteBytes", serializePaletteColors(this.id));
};

/**
 * Sets the head blend palette colors for the player. This function should be used to update multiple palette colors at once. **Make sure `player.setCustomization` is called beforehand to avoid issues.**
 * @param {Array<[number, number, number, number]>} colors 2-dimensional array where each element has palette index, red, green and blue color data such as `[[0, 255, 0, 0], [3, 0, 255, 0]]`.
 * @throws If `colors` is not an array.
 * @throws If any `paletteIndex` is less than 0 or higher than 3.
 * @throws If any `red`, `green` or `blue` is not an integer between 0 to 255.
 */
mp.Player.prototype.setHeadBlendPaletteColors = function(colors) {
    if (!Array.isArray(colors)) {
        throw new Error("'colors' must be an array");
    }

    for (const color of colors) {
        const [paletteIndex, red, green, blue] = color;
        setPaletteColorInternal(this.id, paletteIndex, red, green, blue);
    }

    this.setVariable("_paletteBytes", serializePaletteColors(this.id));
};

/**
 * Returns the specified head blend palette color for the player.
 * @param {number} paletteIndex 
 * @throws If `paletteIndex` is less than 0 or higher than 3.
 * @returns {Object} An object with `red`, `green` and `blue` properties, ranging from 0 to 255.
 */
mp.Player.prototype.getHeadBlendPaletteColor = function(paletteIndex) {
    if (!Number.isInteger(paletteIndex) || paletteIndex < 0 || paletteIndex >= NUM_PALETTES) {
        throw new Error(`'paletteIndex' must be an integer between 0 and ${NUM_PALETTES - 1}`);
    }

    const color = g_dumpster[(this.id * NUM_PALETTES) + paletteIndex];
    return {
        red: (color >> 16) & 0xFF,
        green: (color >> 8) & 0xFF,
        blue: color & 0xFF
    };
};

/**
 * Returns the head blend palette colors for the player.
 * @returns {Array<Object>} An array of objects where each element has `red`, `green` and `blue` properties, ranging from 0 to 255.
 */
mp.Player.prototype.getHeadBlendPaletteColors = function() {
    const data = new Array(NUM_PALETTES);
    for (let i = 0, colorIndex = this.id * NUM_PALETTES; i < NUM_PALETTES; i++, colorIndex++) {
        const color = g_dumpster[colorIndex];

        data[i] = {
            red: (color >> 16) & 0xFF,
            green: (color >> 8) & 0xFF,
            blue: color & 0xFF
        };
    }

    return data;
};

// RAGEMP events
function onPlayerJoin(player) {
    const offset = player.id * NUM_PALETTES;
    g_dumpster.fill(DEFAULT_COLOR, offset, offset + NUM_PALETTES); // reset stored palette colors for the player id
}

mp.events.add("playerJoin", onPlayerJoin);
