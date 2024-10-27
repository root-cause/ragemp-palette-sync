const NUM_PALETTES = 4;
const ENTITY_TYPE_PLAYER = 0;

function isBitSet(num, position) {
    return (num & (1 << position)) !== 0;
}

function applyPaletteColorsFromBuffer(player, paletteBytes) {
    if (paletteBytes == null) {
        return;
    }

    const reader = new DataView(paletteBytes);
    let readOffset = 0;

    const paletteBits = reader.getUint8(readOffset++);
    for (let paletteIndex = 0; paletteIndex < NUM_PALETTES; paletteIndex++) {
        if (!isBitSet(paletteBits, paletteIndex)) {
            player.setHeadBlendPaletteColor(255, 255, 255, paletteIndex);
        } else {
            player.setHeadBlendPaletteColor(reader.getUint8(readOffset++), reader.getUint8(readOffset++), reader.getUint8(readOffset++), paletteIndex);
        }
    }
}

// Event handlers
function onEntityStreamIn(entity) {
    if (entity.typeInt === ENTITY_TYPE_PLAYER) {
        applyPaletteColorsFromBuffer(entity, entity.getVariable("_paletteBytes"));
    }
}

function onEntityPaletteBytesChange(entity, newBytes) {
    if (entity.typeInt === ENTITY_TYPE_PLAYER && entity.handle !== 0) {
        applyPaletteColorsFromBuffer(entity, newBytes);
    }
}

// Register event handlers
mp.events.add("entityStreamIn", onEntityStreamIn);
mp.events.addDataHandler("_paletteBytes", onEntityPaletteBytesChange);
