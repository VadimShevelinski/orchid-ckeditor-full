import { Controller } from '@hotwired/stimulus';
import ClassicEditor from 'ckeditor5-custom-build-full/build/ckeditor'; // Предполагаем, что это твоя рабочая кастомная сборка CKEditor 5
import { useMeta } from 'stimulus-use';

export default class extends Controller {
	static targets = ['editor', 'input'];

	// Убедись, что это соответствует имени твоего мета-тега (например, <meta name="csrf-token" ...>)
	// Если у тебя <meta name="csrf_token" ...>, то 'csrf_token' правильно.
	static metaNames = ['csrf-token']; // Чаще используется дефис в Laravel

	static values = {
		// Конфигурация, передаваемая из data-ckeditor-config-value
		// Все опции здесь должны быть валидными для CKEditor 5
		config: { type: Object, default: {} }
	};

	// Объявляем свойство для хранения экземпляра редактора
	editor = null;

	initialize() {
		console.log('Stimulus CKEditor Controller: initialize');
		useMeta(this); // Для получения this.csrfTokenMeta (или this.csrf_tokenMeta)
	}

	connect() {
		console.log('Stimulus CKEditor Controller: connect');

		if (!this.hasEditorTarget) {
			console.error('Stimulus CKEditor Controller: "editor" target not found! CKEditor cannot be initialized.');
			return;
		}
		console.log('Stimulus CKEditor Controller: "editor" target found:', this.editorTarget);

		if (this.hasInputTarget) {
			console.log('Stimulus CKEditor Controller: "input" target found:', this.inputTarget);
			console.log('Stimulus CKEditor Controller: Initial value from input target:', this.inputTarget.value);
		} else {
			console.warn('Stimulus CKEditor Controller: "input" target not found. Data binding might not work as expected.');
		}

		// Получаем CSRF-токен. Имя this.csrfTokenMeta зависит от static metaNames.
		// Если metaNames = ['csrf-token'], то будет this.csrfTokenMeta.
		// Если metaNames = ['csrf_token'], то будет this.csrf_tokenMeta (stimulus-use делает camelCase).
		// Проверь, какое имя свойства у тебя реально работает.
		const csrfToken = this.csrfTokenMeta; // или this.csrf_tokenMeta
		if (csrfToken) {
			console.log('Stimulus CKEditor Controller: CSRF token found:', csrfToken);
		} else {
			console.warn('Stimulus CKEditor Controller: CSRF token meta tag not found. File uploads might fail.');
		}

		// 1. Базовая конфигурация из data-атрибута (this.configValue)
		// Глубокое копирование, чтобы не изменять исходный объект, если он используется где-то еще.
		const baseConfigFromDataAttribute = JSON.parse(JSON.stringify(this.configValue || {}));

		// 2. Очистка baseConfigFromDataAttribute от невалидных для CKEditor 5 опций
		// Это КРИТИЧЕСКИ ВАЖНО, если из PHP могут приходить опции для CKEditor 4.
		delete baseConfigFromDataAttribute.filebrowserImageBrowseUrl;
		delete baseConfigFromDataAttribute.filebrowserImageUploadUrl;
		delete baseConfigFromDataAttribute.filebrowserBrowseUrl;
		delete baseConfigFromDataAttribute.filebrowserUploadUrl;
		delete baseConfigFromDataAttribute.fileBrowserUploadUrl; // Еще один вариант написания
		// Добавь сюда удаление других специфичных для CKEditor 4 опций, если они есть

		// 3. Конфигурация по умолчанию для CKEditor 5 (если не переопределена в baseConfig)
		// Эти настройки будут применены, если они не пришли из data-атрибута,
		// или дополнят/переопределят их, в зависимости от того, как ты мержишь.
		const defaultConfigForCKEditor5 = {
			// Пример: если simpleUpload должен быть всегда, но его можно кастомизировать
			simpleUpload: {
				uploadUrl: '/your-default-upload-url', // Замени на свой URL по умолчанию
				headers: {}
			},
			image: {
				toolbar: [
					'imageStyle:inline', 'imageStyle:block', 'imageStyle:side',
					'|',
					'toggleImageCaption', 'imageTextAlternative'
				],
				// ... другие настройки для image по умолчанию
			},
			// Добавь сюда другие стандартные плагины и их конфигурацию,
			// которые должны быть в каждой инстанции редактора, если не переопределены.
			// Например, toolbar, plugins и т.д.
			// toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo' ],
		};

		// 4. Слияние конфигураций:
		// Настройки из data-атрибута (baseConfigFromDataAttribute) имеют приоритет
		// над настройками по умолчанию (defaultConfigForCKEditor5).
		// Для вложенных объектов (как image.toolbar), нужно более аккуратное слияние,
		// если хочешь дополнять, а не полностью заменять.
		const finalConfig = {
			...defaultConfigForCKEditor5, // Сначала дефолтные для CK5
			...baseConfigFromDataAttribute, // Затем переопределяем/дополняем из data-атрибута

			// Более аккуратное слияние для вложенных объектов, если это нужно:
			// Например, если хочешь, чтобы image.toolbar из baseConfig дополнял, а не заменял:
			image: {
				...defaultConfigForCKEditor5.image,       // Сначала дефолтный image config
				...(baseConfigFromDataAttribute.image || {}) // Затем из data-атрибута
				// Если хочешь, чтобы тулбар из baseConfig заменял дефолтный, то это уже сделано выше через ...baseConfigFromDataAttribute
			},
			// Аналогично для simpleUpload, если хочешь разрешить его кастомизацию через data-атрибут
			simpleUpload: {
				...defaultConfigForCKEditor5.simpleUpload,
				...(baseConfigFromDataAttribute.simpleUpload || {})
			}
		};

		// Добавляем CSRF токен в headers, если SimpleUpload сконфигурирован
		if (finalConfig.simpleUpload && finalConfig.simpleUpload.uploadUrl && csrfToken) {
			finalConfig.simpleUpload.headers['X-CSRF-Token'] = csrfToken;
		} else if (finalConfig.simpleUpload && finalConfig.simpleUpload.uploadUrl && !csrfToken) {
			console.warn('Stimulus CKEditor Controller: simpleUpload is configured, but CSRF token is missing.');
		}

		// Если simpleUpload не нужен или не сконфигурирован полностью (нет uploadUrl), удаляем его
		if (!finalConfig.simpleUpload || !finalConfig.simpleUpload.uploadUrl) {
			delete finalConfig.simpleUpload;
		}

		console.log('Stimulus CKEditor Controller: Final CKEditor 5 config (cleaned and merged):', JSON.parse(JSON.stringify(finalConfig)));

		const targetElementForEditor = this.editorTarget;

		ClassicEditor
			.create(targetElementForEditor, finalConfig)
			.then(editor => {
				console.log('Stimulus CKEditor Controller: CKEditor 5 initialized successfully!');
				this.editor = editor;

				if (this.hasInputTarget) {
					this.editor.model.document.on('change:data', () => {
						this.inputTarget.value = this.editor.getData();
					});

					if (this.inputTarget.value) {
						this.editor.setData(this.inputTarget.value);
					}
				}
			})
			.catch(error => {
				console.error('Stimulus CKEditor Controller: CKEditor 5 INITIALIZATION ERROR', error);
			});
	}

	disconnect() {
		console.log('Stimulus CKEditor Controller: disconnect');
		if (this.editor) {
			this.editor.destroy()
				.then(() => console.log('Stimulus CKEditor Controller: Editor destroyed successfully.'))
				.catch(error => console.error('Stimulus CKEditor Controller: Error destroying editor', error));
			this.editor = null;
		}
	}
}