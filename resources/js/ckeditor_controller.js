import { Controller } from '@hotwired/stimulus'
// Убедись, что этот путь корректен и сборка CKEditor 5 действительно там находится
// и доступна для импорта в твоем процессе сборки JS (Mix/Vite).
import ClassicEditor from 'ckeditor5-custom-build-full/build/ckeditor'
import { useMeta } from 'stimulus-use'

export default class extends Controller {
	static targets = ['editor', 'input']

	// Если твой мета-тег в HTML выглядит как <meta name="csrf-token" ...> (с дефисом),
	// то здесь должно быть: static metaNames = ['csrf-token']
	// Если <meta name="csrf_token" ...> (с подчеркиванием), то текущая запись верна.
	static metaNames = ['csrf_token']

	static values = {
		// config: Object // Оставляем так, но убедимся, что он передается корректно из HTML
		// Для большей надежности можно задать значение по умолчанию, если оно не передано
		config: { type: Object, default: {} }
	}

	initialize() {
		console.log('Stimulus CKEditor Controller: initialize');
		useMeta(this); // Это должно сделать this.csrfTokenMeta доступным
	}

	connect() {
		console.log('Stimulus CKEditor Controller: connect');

		// --- ОТЛАДКА: Проверка таргетов ---
		if (!this.hasEditorTarget) {
			console.error('Stimulus CKEditor Controller: "editor" target not found! CKEditor cannot be initialized.');
			return; // Выходим, если нет основного таргета
		}
		console.log('Stimulus CKEditor Controller: "editor" target found:', this.editorTarget);

		if (!this.hasInputTarget) {
			console.warn('Stimulus CKEditor Controller: "input" target not found. Data binding might not work as expected.');
			// Не выходим, так как редактор может работать и без input-таргета,
			// но синхронизация данных с формой не будет работать.
		} else {
			console.log('Stimulus CKEditor Controller: "input" target found:', this.inputTarget);
			console.log('Stimulus CKEditor Controller: Initial value from input target:', this.inputTarget.value);
		}
		// --- КОНЕЦ ОТЛАДКИ ---

		// --- ОТЛАДКА: CSRF токен ---
		const csrfToken = this.csrfTokenMeta; // stimulus-use должен был заполнить это
		if (csrfToken) {
			console.log('Stimulus CKEditor Controller: CSRF token found via meta tag:', csrfToken);
		} else {
			console.warn('Stimulus CKEditor Controller: CSRF token meta tag (name="csrf_token" or as defined in metaNames) not found or empty. File uploads via SimpleUpload might fail.');
		}
		// --- КОНЕЦ ОТЛАДКИ ---

		// Формируем конфигурацию
		// Клонируем this.configValue, чтобы не изменять исходный объект, если он будет переиспользован
		const baseConfig = JSON.parse(JSON.stringify(this.configValue || {}));

		const finalConfig = {
			...baseConfig, // Сначала базовые настройки из HTML-атрибута
			// Переопределяем или добавляем simpleUpload и image, если они нужны всегда
			// или если они не передаются через configValue
			simpleUpload: {
				uploadUrl: '/upload', // Убедись, что этот URL правильный и рабочий
				headers: {}
			},
			image: {
				toolbar: [
					'imageStyle:full',
					'imageStyle:side',
					'|',
					'imageTextAlternative'
				],
				... (baseConfig.image || {}) // Позволяем переопределить или дополнить image из configValue
			},
			// Добавь сюда другие плагины/настройки по умолчанию, если нужно
		};

		// Добавляем CSRF токен в headers только если он есть
		if (csrfToken) {
			finalConfig.simpleUpload.headers['X-CSRF-Token'] = csrfToken;
		} else {
			// Если токена нет, возможно, стоит удалить simpleUpload из конфигурации,
			// чтобы избежать ошибок от плагина, если он не может работать без токена.
			// Либо плагин SimpleUpload должен сам корректно обрабатывать отсутствие заголовка.
			// delete finalConfig.simpleUpload; // Раскомментируй, если SimpleUpload ломает все без токена
			console.warn('Stimulus CKEditor Controller: Initializing CKEditor without CSRF token in SimpleUpload headers.');
		}

		// --- ОТЛАДКА: Итоговая конфигурация ---
		console.log('Stimulus CKEditor Controller: Final CKEditor config:', JSON.parse(JSON.stringify(finalConfig))); // JSON.parse(JSON.stringify) для чистого вывода объекта без прокси и т.п.
		// --- КОНЕЦ ОТЛАДКИ ---


		// Попробуем обернуть this.editorTarget в дополнительный div, если это помогает с некоторыми редкими багами рендеринга
		// const editorWrapper = document.createElement('div');
		// this.editorTarget.appendChild(editorWrapper);
		// const targetElementForEditor = editorWrapper;
		// Вместо этого просто используем this.editorTarget
		const targetElementForEditor = this.editorTarget;

		// Инициализация редактора
		ClassicEditor.create(targetElementForEditor, finalConfig)
			.then(editor => {
				console.log('Stimulus CKEditor Controller: CKEditor initialized successfully!');
				this.editor = editor; // Сохраняем экземпляр редактора

				// Синхронизация данных из редактора в скрытое поле input
				if (this.hasInputTarget) {
					this.editor.model.document.on('change:data', () => {
						this.inputTarget.value = this.editor.getData();
						// console.log('Stimulus CKEditor Controller: Data synced to input target.');
					});

					// Установка начальных данных в редактор из input
					// Делаем это после успешной инициализации
					// Убедимся, что inputTarget существует перед чтением value
					if (this.inputTarget.value) {
						console.log('Stimulus CKEditor Controller: Setting initial data to editor from inputTarget.value');
						this.editor.setData(this.inputTarget.value);
					} else {
						console.log('Stimulus CKEditor Controller: inputTarget.value is empty, not setting initial data.');
					}
				} else {
					console.warn('Stimulus CKEditor Controller: No input target, data will not be synced to a form field.');
				}
			})
			.catch(error => {
				// Эта ошибка очень важна!
				console.error('Stimulus CKEditor Controller: CKEditor INITIALIZATION ERROR', error);
			});
	}

	disconnect() {
		console.log('Stimulus CKEditor Controller: disconnect');
		if (this.editor) {
			this.editor.destroy()
				.then(() => console.log('Stimulus CKEditor Controller: Editor destroyed successfully.'))
				.catch(error => console.error('Stimulus CKEditor Controller: Error destroying editor', error));
			this.editor = null; // Обнуляем ссылку
		}
	}
}