<script type="text/javascript" src="https://js.braintreegateway.com/js/braintree-2.23.0.min.js"></script>
<script type="text/javascript" >
    $(function() {
        braintree.setup("{{ $braintreeClientToken }}", "custom", {
            id: "payment-form",
            hostedFields: {
                number: {
                    selector: "#card_number",
                    placeholder: "{{ trans('texts.card_number') }}"
                },
                cvv: {
                    selector: "#cvv",
                    placeholder: "{{ trans('texts.cvv') }}"
                },
                expirationMonth: {
                    selector: "#expiration_month",
                    placeholder: "{{ trans('texts.expiration_month') }}"
                },
                expirationYear: {
                    selector: "#expiration_year",
                    placeholder: "{{ trans('texts.expiration_year') }}"
                },
                styles: {
                    'input': {
                        'font-family': {!!  json_encode(Utils::getFromCache($account->getBodyFontId(), 'fonts')['css_stack']) !!},
                        'font-weight': "{{ Utils::getFromCache($account->getBodyFontId(), 'fonts')['css_weight'] }}",
                        'font-size': '16px'
                    }
                }
            },
            onError: function(e) {
                var $form = $('.payment-form');
                $form.find('button').prop('disabled', false);
                // Show the errors on the form
                if (e.details && e.details.invalidFieldKeys.length) {
                    var invalidField = e.details.invalidFieldKeys[0];

                    if (invalidField == 'number') {
                        $('#js-error-message').html('{{ trans('texts.invalid_card_number') }}').fadeIn();
                    }
                    else if (invalidField == 'expirationDate' || invalidField == 'expirationYear' || invalidField == 'expirationMonth') {
                        $('#js-error-message').html('{{ trans('texts.invalid_expiry') }}').fadeIn();
                    }
                    else if (invalidField == 'cvv') {
                        $('#js-error-message').html('{{ trans('texts.invalid_cvv') }}').fadeIn();
                    }
                }
                else {
                    $('#js-error-message').html(e.message).fadeIn();
                }
            }
        });
        $('.payment-form').submit(function(event) {
            var $form = $(this);

            // Disable the submit button to prevent repeated clicks
            $form.find('button').prop('disabled', true);
            $('#js-error-message').hide();
        });
    });
</script>