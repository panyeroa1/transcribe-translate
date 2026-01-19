class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      // Convert Float32 to Int16 PCM
      const buffer = new ArrayBuffer(channelData.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      // Send the Int16 buffer to the main thread
      this.port.postMessage(buffer, [buffer]);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
