<!DOCTYPE html>
<html lang="{{ App::getLocale() }}">
<head>
  <meta charset="utf-8">
</head>
<body>
    @if (Utils::isNinjaDev())
        @include('emails.view_action', ['link' => $link, 'entityType' => $entityType])
    @endif
    {!! $body !!}
</body>
</html>