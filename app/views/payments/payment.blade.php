@extends('public.header')

@section('content')

<style type="text/css">

body {
    background-color: #f8f8f8;
    color: #1b1a1a;
}

.panel-body {
    padding-bottom: 50px;
}


.container input[type=text],
.container select {
    font-weight: 300;
    font-family: 'Roboto', sans-serif;
    width: 100%;
    padding: 11px;
    color: #8c8c8c;
    background: #f9f9f9;
    border: 1px solid #ebe7e7;
    border-radius: 3px;
    margin: 6px 0 6px 0;
    font-size: 16px;
    min-height: 42px !important;
    font-weight: 400;
}

.container input[placeholder],
.container select[placeholder] {
   color: #444444;
}

div.row {
    padding-top: 8px;
}

header {
    margin: 0px !important
}
    
@media screen and (min-width: 700px) {
    header {
        margin: 20px 0 75px;
        float: left;
    }

    .panel-body {
        padding-left: 100px;
        padding-right: 100px;
    }

}

h2 {
    font-weight: 300;
    font-size: 30px;
    color: #2e2b2b;
    line-height: 1;
}

h3 {
    font-weight: 900;
    margin-top: 10px;
    font-size: 15px;
}

h3 .help {
    font-style: italic;
    font-weight: normal;
    color: #888888;
}

header h3 {
    text-transform: uppercase;    
}
    
header h3 span {
    display: inline-block;
    margin-left: 8px;
}
    
header h3 em {
    font-style: normal;
    color: #eb8039;
}



.secure {
    text-align: right;
    float: right;
    background: url({{ asset('/images/icon-shield.png') }}) right 22px no-repeat;
    padding: 17px 55px 10px 0;
    }
    
.secure h3 {
    color: #36b855;
    font-size: 30px;
    margin-bottom: 8px;
    margin-top: 0px;
    }
    
.secure div {
    color: #acacac;
    font-size: 15px;
    font-weight: 900;
    text-transform: uppercase;
}



</style>

{{ Former::vertical_open($url)->rules(array(
'first_name' => 'required',
'last_name' => 'required',   
'card_number' => 'required',
'expiration_month' => 'required',
'expiration_year' => 'required',
'cvv' => 'required',
'address1' => 'required',
'city' => 'required',
'state' => 'required',
'postal_code' => 'required',
'country' => 'required',
'phone' => 'required',
'email' => 'required|email'
)) }}

@if ($client)
  {{ Former::populate($client) }}
  {{ Former::populateField('first_name', $contact->first_name) }}
  {{ Former::populateField('last_name', $contact->last_name) }}
@endif

<div class="container">
<p>&nbsp;</p>

<div class="panel panel-default">
  <div class="panel-body">

    <div class="row">
        <div class="col-md-6">
            <header>
                <h2>{{ $client->getDisplayName() }}</h2>
                <h3>{{ trans('texts.invoice') . ' ' . $invoiceNumber }}<span>|&nbsp; {{ trans('texts.amount_due') }}: <em>{{ Utils::formatMoney($amount, $currencyId) }}</em></span></h3>
            </header>  
        </div>
        <div class="col-md-6">
            @if (Request::secure() || Utils::isNinjaDev())
            <div class="secure">
                <h3>{{ trans('texts.secure_payment') }}</h3>
                <div>{{ trans('texts.256_encryption') }}</div>       
            </div>
            @endif
        </div>
    </div>

    <p>&nbsp;<br/>&nbsp;</p>

    <div>
        <h3>{{ trans('texts.contact_information') }}</h3>
        <div class="row">
            <div class="col-md-5">
                {{ Former::text('first_name')->placeholder(trans('texts.first_name'))->raw() }}
            </div>
            <div class="col-md-5">
                {{ Former::text('last_name')->placeholder(trans('texts.last_name'))->raw() }}
            </div>
        </div>
        @if (isset($paymentTitle))
        <div class="row">
            <div class="col-md-10">
                {{ Former::text('email')->placeholder(trans('texts.email'))->raw() }}
            </div>
        </div>
        @endif

        <p>&nbsp;<br/>&nbsp;</p>

        <h3>{{ trans('texts.billing_address') }}</h3>
        <div class="row">
            <div class="col-md-10">
                {{ Former::text('address1')->placeholder(trans('texts.address1'))->raw() }}
            </div>
        </div>
        <div class="row">
            <div class="col-md-5">
                {{ Former::text('address2')->placeholder(trans('texts.address2'))->raw() }}
            </div>            
            <div class="col-md-5">
                {{ Former::text('city')->placeholder(trans('texts.city'))->raw() }}
            </div>
        </div>
        <div class="row">
            <div class="col-md-5">
                {{ Former::text('state')->placeholder(trans('texts.state'))->raw() }}
            </div>
            <div class="col-md-5">
                {{ Former::text('postal_code')->placeholder(trans('texts.postal_code'))->raw() }}
            </div>
        </div>

        <p>&nbsp;<br/>&nbsp;</p>

        <h3>{{ trans('texts.billing_method') }} &nbsp;<span class="help">{{ trans('texts.match_address') }}</span></h3>
        <div class="row">
            <div class="col-md-10">
                {{ Former::text('card_number')->placeholder(trans('texts.card_number'))->raw() }}
            </div>
        </div>
        <div class="row">
            <div class="col-md-4">
                {{ Former::select('expiration_month')->placeholder(trans('texts.expiration_month'))
                      ->addOption('01 - January', '1')
                      ->addOption('02 - February', '2')
                      ->addOption('03 - March', '3')
                      ->addOption('04 - April', '4')
                      ->addOption('05 - May', '5')
                      ->addOption('06 - June', '6')
                      ->addOption('07 - July', '7')
                      ->addOption('08 - August', '8')
                      ->addOption('09 - September', '9')
                      ->addOption('10 - October', '10')
                      ->addOption('11 - November', '11')
                      ->addOption('12 - December', '12')->raw();
                    }}
            </div>
            <div class="col-md-4">
                {{ Former::select('expiration_year')->placeholder(trans('texts.expiration_year'))
                    ->addOption('2014', '2014')
                    ->addOption('2015', '2015')
                    ->addOption('2016', '2016')
                    ->addOption('2017', '2017')
                    ->addOption('2018', '2018')
                    ->addOption('2019', '2019')
                    ->addOption('2020', '2020')->raw();
                  }}
            </div>
            <div class="col-md-2">
                {{ Former::text('cvv')->placeholder(trans('texts.cvv'))->raw() }}
            </div>
        </div>


        <div class="row" style="padding-top:18px">
            <div class="col-md-4">
                @if ($account->showTokenCheckbox())        
                    <input id="token_billing" type="checkbox" name="token_billing" {{ $account->selectTokenCheckbox() ? 'CHECKED' : '' }} value="1" style="margin-left:0px; vertical-align:text-top">
                    <label for="token_billing" class="checkbox" style="display: inline; font-size:15px">{{ trans('texts.token_billing') }}</label>
                    <span class="help-block" style="font-size:15px">{{ trans('texts.token_billing_secure', ['stripe_link' => link_to('https://stripe.com/', 'Stripe.com', ['target' => '_blank'])]) }}</span>
                @endif                    
            </div>  

            <div class="col-md-6">            
            @if (isset($acceptedCreditCardTypes))                
                <div class="pull-right">
                    @foreach ($acceptedCreditCardTypes as $card)
                    <img src="{{ $card['source'] }}" alt="{{ $card['alt'] }}" style="width: 70px; display: inline; margin-right: 6px;"/>
                    @endforeach
                </div>
            @endif
            </div>
        </div>
        

        <p>&nbsp;<br/>&nbsp;</p>

        <div class="row">
            <div class="col-md-4 col-md-offset-3">
                {{ Button::block_success_submit_lg(strtoupper(trans('texts.pay_now') . ' - ' . Utils::formatMoney($amount, $currencyId) )) }}
            </div>
        </div>


    </div>

  </div>
</div>    
    

<p>&nbsp;</p>
<p>&nbsp;</p>

</div>

<!--
    @if (isset($paymentTitle))
      <h2>{{ $paymentTitle }}<br/>
      @if (isset($paymentSubtitle))
        <small>{{ $paymentSubtitle }}</small>
      @endif    
      </h2>&nbsp;<p/>
    @endif
-->

{{ Former::close() }}

@stop