@extends('header')

@section('content')
		
	<ul class="nav nav-tabs nav nav-justified">
		{{ HTML::nav_link('company/details', 'company_details') }}
		{{ HTML::nav_link('company/payments', 'online_payments') }}
    {{ HTML::nav_link('company/notifications', 'notifications') }}
		{{ HTML::nav_link('company/import_export', 'import_export', 'company/import_map') }}
	</ul>
	<p>&nbsp;</p>

@stop