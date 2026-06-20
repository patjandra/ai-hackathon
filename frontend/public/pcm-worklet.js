// AudioWorklet: converts Float32 mic samples to 16-bit PCM (linear16) frames
// and ships them to the main thread. The AudioContext is created at 16 kHz, so
// no resampling is needed here — just float -> int16. (plan issue A)
class PCMWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    const pcm = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorklet);
