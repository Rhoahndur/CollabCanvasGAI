/**
 * Some models emit tool calls as text (e.g. "TOOLCALL>[{...}]") instead of
 * using the proper tool_calls delta format. Parse that text into the standard
 * tool call structure used by the __TOOL_CALLS__ marker.
 */
function parseTextToolCalls(text) {
  const idx = text.indexOf('TOOLCALL>');
  if (idx < 0) return [];

  const afterMarker = text.substring(idx + 'TOOLCALL>'.length).trim();
  if (!afterMarker.startsWith('[')) return [];

  const lastBracket = afterMarker.lastIndexOf(']');
  const jsonStr = lastBracket >= 0
    ? afterMarker.substring(0, lastBracket + 1)
    : afterMarker.replace(/[>\s]+$/, '') + ']';

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((tc) => tc.name || tc.function?.name)
      .map((tc, i) => ({
        id: `call_text_${Date.now()}_${i}`,
        type: 'function',
        function: {
          name: tc.name || tc.function?.name,
          arguments:
            typeof tc.arguments === 'string'
              ? tc.arguments
              : JSON.stringify(tc.arguments ?? {}),
        },
      }));
  } catch {
    return [];
  }
}

module.exports = { parseTextToolCalls };
