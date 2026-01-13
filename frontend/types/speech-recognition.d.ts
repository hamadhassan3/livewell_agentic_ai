// Type definitions for Web Speech API
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	grammars: SpeechGrammarList;
	interimResults: boolean;
	lang: string;
	maxAlternatives: number;
	onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
	onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
	onend: ((this: SpeechRecognition, ev: Event) => any) | null;
	onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
	onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
	onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
	onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
	onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
	onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
	onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
	onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
	serviceURI: string;
	start(): void;
	stop(): void;
	abort(): void;
}

declare var SpeechRecognition: {
	prototype: SpeechRecognition;
	new (): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
	prototype: SpeechRecognition;
	new (): SpeechRecognition;
};

interface SpeechRecognitionErrorEvent extends Event {
	error:
		| 'no-speech'
		| 'aborted'
		| 'audio-capture'
		| 'network'
		| 'not-allowed'
		| 'service-not-allowed'
		| 'bad-grammar'
		| 'language-not-supported';
	message: string;
}

interface SpeechRecognitionEvent extends Event {
	emma: Document | null;
	interpretation: any;
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
	length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
	isFinal: boolean;
	length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
	confidence: number;
	transcript: string;
}

interface SpeechGrammarList {
	length: number;
	item(index: number): SpeechGrammar;
	addFromString(string: string, weight?: number): void;
	addFromURI(src: string, weight?: number): void;
	[index: number]: SpeechGrammar;
}

interface SpeechGrammar {
	src: string;
	weight: number;
}

interface Window {
	SpeechRecognition: typeof SpeechRecognition;
	webkitSpeechRecognition: typeof webkitSpeechRecognition;
}
