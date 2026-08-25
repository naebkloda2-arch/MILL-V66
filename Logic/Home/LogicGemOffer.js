'use strict';

/**
 * Одна награда внутри акции.
 * Порядок полей проверен по дампу друга (script_script_so.txt) — не менять местами.
 */
class LogicGemOffer {
  static encode(w, itemType, amount, csvGroup, csvId, skinId) {
    w.writeVInt(itemType);
    w.writeVInt(amount);
    w.writeDataReference(csvGroup, csvId);
    w.writeVInt(skinId);
  }
}

module.exports = { LogicGemOffer };
