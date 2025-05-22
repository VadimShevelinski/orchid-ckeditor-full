import { Controller } from '@hotwired/stimulus'
import ClassicEditor from 'ckeditor5-custom-build-full/build/ckeditor'
import { useMeta } from 'stimulus-use'

export default class extends Controller {
	static targets = ['editor', 'input']
	static metaNames = ['csrf_token']

	static values = {
		config: Object
	}

	initialize() {
		useMeta(this)
	}

	connect() {
		const csrfToken = this.csrfTokenMeta
		const config = {
			...this.configValue,
			simpleUpload: {
				uploadUrl: '/upload',
				headers: {
					'X-CSRF-Token': csrfToken
				}
			},
			image: {
				toolbar: [
					'imageStyle:full',
					'imageStyle:side',
					'|',
					'imageTextAlternative'
				]
			}
		}

		ClassicEditor.create(this.editorTarget, config)
			.then(editor => {
				this.editor = editor

				this.editor.model.document.on('change:data', () => {
					this.inputTarget.value = this.editor.getData()
				})

				this.editor.setData(this.inputTarget.value)
			})
			.catch(error => {
				console.error('Editor initialization error', error)
			})
	}

	disconnect() {
		if (this.editor) {
			this.editor.destroy().catch(console.error)
		}
	}
}
