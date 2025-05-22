<?php

declare(strict_types=1);

namespace VadimShevelinski\OrchidCKEditor;

use Illuminate\Support\ServiceProvider;
use Illuminate\Contracts\View\Factory as ViewFactory;
use Orchid\Support\Facades\Dashboard;

class CKEditorServiceProvider extends ServiceProvider
{
    public function boot(ViewFactory $viewFactory): void // Используем ViewFactory здесь
    {
        // Публикация ассетов твоего пакета
        $this->offerPublishing();

        $this->callAfterResolving(Dashboard::class, function (Dashboard $dashboard) {

            $dashboard->registerResource('scripts', 'https://cdn.ckeditor.com/ckeditor5/40.0.0/classic/translations/ru.js');

            $dashboard->registerResource('scripts', asset('vendor/vadimshevelinski/orchid-ckeditor-full/js/orchid_ckeditor.js'));
        });

    }

    public function register(): void
    {
        $this->loadViewsFrom(__DIR__ . '/../views', 'ckeditor');
        $this->mergeConfigFrom(__DIR__ . '/../config/config.php', 'ckeditor');
    }

    protected function offerPublishing(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            __DIR__ . '/../public' => public_path('vendor/vadimshevelinski/orchid-ckeditor-full'),
        ], ['ckeditor-assets', 'laravel-assets', 'orchid-assets']);

        $this->publishes([
            __DIR__ . '/../config/config.php' => config_path('ckeditor.php'),
        ], 'ckeditor-config');
    }
}
