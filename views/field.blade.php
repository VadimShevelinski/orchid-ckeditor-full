@component($typeForm, get_defined_vars())
    <div data-controller="ckeditor"
         data-ckeditor-id-value="{{ $id }}"
         data-ckeditor-config-value='@json($options)'
    >
        <div data-ckeditor-target="editor" class="form-control" style="min-height: 200px;"></div>

        <input id="{{ $id }}"
               data-ckeditor-target="input"
               name="{{ $name }}"
               type="hidden"
               value="{{ $value ?? '' }}"
        />
    </div>
@endcomponent
