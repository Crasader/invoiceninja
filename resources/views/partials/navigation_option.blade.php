<li class="{{ Request::is("{$option}*") ? 'active' : '' }}">

    @if ($option == 'settings')

        <a type="button" class="btn btn-default btn-sm pull-right"
            href="{{ Utils::getDocsUrl(request()->path()) }}" target="_blank">
            <i class="fa fa-question-circle" style="width:20px" title="{{ trans('texts.help') }}"></i>
        </a>

    @elseif (Auth::user()->can('create', $option) || Auth::user()->can('create', substr($option, 0, -1)))

        <a type="button" class="btn btn-primary btn-sm pull-right"
            href="{{ url("/{$option}/create") }}">
            <i class="fa fa-plus-circle" style="width:20px" title="{{ trans('texts.create_new') }}"></i>
        </a>

    @endif

    <a href="{{ url($option == 'recurring' ? 'recurring_invoice' : $option) }}"
        style="font-size:16px; padding-top:6px; padding-bottom:6px"
        class="{{ Request::is("{$option}*") ? 'active' : '' }}">
        <i class="fa fa-{{ empty($icon) ? \App\Models\EntityModel::getIcon($option) : $icon }}" style="width:46px; padding-right:10px"></i>
        {{ ($option == 'recurring_invoices') ? trans('texts.recurring') : trans("texts.{$option}") }}
        {!! Utils::isTrial() && in_array($option, ['quotes', 'tasks', 'expenses', 'vendors']) ? '&nbsp;<sup>' . trans('texts.pro') . '</sup>' : '' !!}
    </a>

</li>
