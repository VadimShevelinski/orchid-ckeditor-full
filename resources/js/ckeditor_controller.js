import { Controller } from '@hotwired/stimulus';
// import ClassicEditor from 'ckeditor5-custom-build-full/build/ckeditor';
import { useMeta } from 'stimulus-use';

let EditorInstanceFromCDN;

export default class extends Controller {
	static targets = ['editor', 'input'];
	static metaNames = ['csrf-token'];
	static values = {
		config: { type: Object, default: {} }
	};

	editor = null;

	initialize() {
		useMeta(this);
		EditorInstanceFromCDN = window.ClassicEditor;
	}

	connect() {
		if (!this.hasEditorTarget) {
			console.error('CKEditor CDN: Editor target not found.');
			return;
		}

		if (typeof EditorInstanceFromCDN === 'undefined') {
			console.error('CKEditor CDN: window.ClassicEditor is not defined. CDN script might not have loaded.');
			return;
		}

		const csrfToken = this.csrfTokenMeta;
		const baseConfig = JSON.parse(JSON.stringify(this.configValue || {}));

		const cdnConfig = {
			...baseConfig, // Настройки из PHP (после очистки) будут иметь приоритет
			toolbar: {
				items: [
					'heading', '|',
					'bold', 'italic', 'link', '|',
					'bulletedList', 'numberedList', '|',
					// 'imageUpload', // ImageUpload требует плагин, которого может не быть в базовой classic CDN
					'blockQuote', '|',
					'undo', 'redo'
				]
			},
			image: {
				toolbar: [

				]
			},
			// language: 'ru' // Если подключил языковой файл с CDN
		};

		delete cdnConfig.simpleUpload;

		console.log('Stimulus CKEditor Controller: Final CKEditor 5 config for CDN:', JSON.parse(JSON.stringify(cdnConfig)));

		EditorInstanceFromCDN
			.create(this.editorTarget, cdnConfig)
			.then(editor => {
				console.log('Stimulus CKEditor Controller: CKEditor (from CDN) initialized successfully!');
				this.editor = editor;

				if (this.hasInputTarget) {
					editor.model.document.on('change:data', () => {
						this.inputTarget.value = editor.getData();
					});
					if (this.inputTarget.value) {
						editor.setData(this.inputTarget.value);
					}
				}
			})
			.catch(error => {
				console.error('Stimulus CKEditor Controller: CKEditor (from CDN) INITIALIZATION ERROR', error);
			});
	}

	disconnect() {
		if (this.editor) {
			this.editor.destroy().catch(e => console.error("Error destroying CKEditor (CDN)", e));
			this.editor = null;
		}
	}
}