function normalizeWords(value) {
    return value.trim().split(/\s+/).filter(Boolean);
}

/**
 * Calculates words per minute and accuracy for a typing test.
 * @param {object} params - { promptText, typedText, durationSeconds }
 * @returns {object} { wordsPerMinute, accuracyPercent }
 */
export function calculateTypingMetrics({ promptText, typedText, durationSeconds }) {
    const safeDuration = Math.max(durationSeconds, 1);
    const promptWords = normalizeWords(promptText);
    const typedWords = normalizeWords(typedText);
    const matchedWords = typedWords.filter((word, index) => word === promptWords[index]).length;
    const grossWpm = (typedText.trim().length / 5) / (safeDuration / 60);
    const accuracy = typedWords.length === 0 ? 0 : (matchedWords / typedWords.length) * 100;

    return {
        wordsPerMinute: Number(grossWpm.toFixed(2)),
        accuracyPercent: Number(accuracy.toFixed(2)),
    };
}
