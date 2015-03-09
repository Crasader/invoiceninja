<?php

return array(

  // client
  'organization' => 'Organisation',
  'name' => 'Navn',
  'id_number' => 'SE/CVR nummer',
  'vat_number' => 'SE/CVR nummer',
  'website' => 'Webside',
  'work_phone' => 'Telefon',
  'address' => 'Adresse',
  'address1' => 'Gade',
  'address2' => 'Nummer',
  'city' => 'By',
  'state' => 'Område',
  'postal_code' => 'Postnummer',
  'country_id' => 'Land',
  'contacts' => 'Kontakter',
  'first_name' => 'Fornavn',
  'last_name' => 'Efternavn',
  'phone' => 'Telefon',
  'email' => 'E-mail',
  'additional_info' => 'Ekstra information',
  'payment_terms' => 'Betalingsvilkår',
  'currency_id' => 'Valuta',
  'size_id' => 'Størrelse',
  'industry_id' => 'Sektor',
  'private_notes' => 'Private notater',

  // invoice
  'invoice' => 'Faktura',
  'client' => 'Klient',
  'invoice_date' => 'Faktureringsdato',
  'due_date' => 'Betalingsfrist',
  'invoice_number' => 'Fakturanummer',
  'invoice_number_short' => 'Faktura #',
  'po_number' => 'Ordrenummer',
  'po_number_short' => 'Ordre #',
  'frequency_id' => 'Frekvens',
  'discount' => 'Rabat',
  'taxes' => 'Skatter',
  'tax' => 'Skat',
  'item' => 'Produkttype',
  'description' => 'Beskrivelse',
  'unit_cost' => 'Pris',
  'quantity' => 'Stk.',
  'line_total' => 'Sum',
  'subtotal' => 'Subtotal',
  'paid_to_date' => 'Betalt',
  'balance_due' => 'Udestående beløb',
  'invoice_design_id' => 'Design',
  'terms' => 'Vilkår',
  'your_invoice' => 'Din faktura',

  'remove_contact' => 'Fjern kontakt',
  'add_contact' => 'Tilføj til kontakt',
  'create_new_client' => 'Opret ny klient',
  'edit_client_details' => 'Ændre klientdetaljer',
  'enable' => 'Aktiver',
  'learn_more' => 'Lær mere',
  'manage_rates' => 'Administrer priser',
  'note_to_client' => 'Note til klient',
  'invoice_terms' => 'Vilkår for fakturaen',
  'save_as_default_terms' => 'Gem som standard vilkår',
  'download_pdf' => 'Download PDF',
  'pay_now' => 'Betal nu',
  'save_invoice' => 'Gem faktura',
  'clone_invoice' => 'Kopier faktura',
  'archive_invoice' => 'Arkiver faktura',
  'delete_invoice' => 'Slet faktura',
  'email_invoice' => 'Send faktura som e-mail',
  'enter_payment' => 'Tilføj betaling',
  'tax_rates' => 'Skattesatser',
  'rate' => 'Sats',
  'settings' => 'Indstillinger',
  'enable_invoice_tax' => 'Aktiver for at specificere en <b>faktura skat</b>',
  'enable_line_item_tax' => 'Aktiver for at specificere per <b>faktura linje skat</b>',

  // navigation
  'dashboard' => 'Dashboard',
  'clients' => 'Klienter',
  'invoices' => 'Fakturaer',
  'payments' => 'Betalinger',
  'credits' => 'Kreditter',
  'history' => 'Historie',
  'search' => 'Søg',
  'sign_up' => 'Registrer dig',
  'guest' => 'Gjest',
  'company_details' => 'Firmainformation',
  'online_payments' => 'Online betaling',
  'notifications' => 'Varsler',
  'import_export' => 'Import/Export',
  'done' => 'Færdig',
  'save' => 'Gem',
  'create' => 'Opret',
  'upload' => 'Upload',
  'import' => 'Importer',
  'download' => 'Download',
  'cancel' => 'Afbrud',
  'close' => 'Luk',
  'provide_email' => 'Venligst opgiv en gyldig e-mail',
  'powered_by' => 'Drevet af',
  'no_items' => 'Ingen elementer',

  // recurring invoices
  'recurring_invoices' => 'Gentagende fakturaer',
  'recurring_help' => '<p>Automatisk send klienter de samme fakturaene ugentlig, bi-månedlig, månedlig, kvartalsvis eller årlig.</p>
        <p>Brug :MONTH, :QUARTER eller :YEAR for dynamiske datoer. Grundliggende matematik fungerer også, for eksempel :MONTH-1.</p>
        <p>Eksempler på dynamiske faktura variabler:</p>
        <ul>
          <li>"Træningsmedlemskab for måneden :MONTH" => "Træningsmedlemskab for måneden Juli"</li>
          <li>":YEAR+1 årlig abonnement" => "2015 årlig abonnement"</li>
          <li>"Forudbetaling for :QUARTER+1" => "Forudbetaling for Q2"</li>
        </ul>',

  // dashboard
  'in_total_revenue' => 'totale indtægter',
  'billed_client' => 'faktureret klient',
  'billed_clients' => 'fakturerede klienter',
  'active_client' => 'aktiv klient',
  'active_clients' => 'aktive klienter',
  'invoices_past_due' => 'Forfaldne fakturaer',
  'upcoming_invoices' => 'Forestående fakturaer',
  'average_invoice' => 'Gennemsnitlige fakturaer',

  // list pages
  'archive' => 'Arkiv',
  'delete' => 'Slet',
  'archive_client' => 'Arkiver klient',
  'delete_client' => 'Slet klient',
  'archive_payment' => 'Arkiver betaling',
  'delete_payment' => 'Slet betaling',
  'archive_credit' => 'Arkiver kredit',
  'delete_credit' => 'Slet kredit',
  'show_archived_deleted' => 'Vis slettet/arkiverede',
  'filter' => 'Filter',
  'new_client' => 'Ny klient',
  'new_invoice' => 'Ny faktura',
  'new_payment' => 'Ny betaling',
  'new_credit' => 'Ny kredit',
  'contact' => 'Kontakt',
  'date_created' => 'Dato oprettet',
  'last_login' => 'Sidst på-logging',
  'balance' => 'Balance',
  'action' => 'Handling',
  'status' => 'Status',
  'invoice_total' => 'Faktura total',
  'frequency' => 'Frekvens',
  'start_date' => 'Startdato',
  'end_date' => 'Slutdato',
  'transaction_reference' => 'Transaktionsreference',
  'method' => 'Betalingsmåde',
  'payment_amount' => 'Beløb',
  'payment_date' => 'Betalingsdato',
  'credit_amount' => 'Kreditbeløb',
  'credit_balance' => 'Kreditsaldo',
  'credit_date' => 'Kreditdato',
  'empty_table' => 'Ingen data er tilgængelige i tabellen',
  'select' => 'Vælg',
  'edit_client' => 'Rediger klient',
  'edit_invoice' => 'Rediger faktura',

  // client view page
  'create_invoice' => 'Lag faktura',
  'enter_credit' => 'Tilføj kredit',
  'last_logged_in' => 'Sidst på-logget',
  'details' => 'Detaljer',
  'standing' => 'Stående',
  'credit' => 'Kredit',
  'activity' => 'Aktivitet',
  'date' => 'Dato',
  'message' => 'Besked',
  'adjustment' => 'Justering',
  'are_you_sure' => 'Er du sikker?',

  // payment pages
  'payment_type_id' => 'Betalingsmetode',
  'amount' => 'Beløb',

  // account/company pages
  'work_email' => 'E-mail',
  'language_id' => 'Sprog',
  'timezone_id' => 'Tidszone',
  'date_format_id' => 'Dato format',
  'datetime_format_id' => 'Dato/Tidsformat',
  'users' => 'Brugere',
  'localization' => 'Lokalisering',
  'remove_logo' => 'Fjern logo',
  'logo_help' => 'Understøttede filtyper: JPEG, GIF og PNG. Anbefalet størrelse: 200px brede og 120px højde',
  'payment_gateway' => 'Betalingsløsning',
  'gateway_id' => 'Tilbyder',
  'email_notifications' => 'Varsel via e-mail',
  'email_sent' => 'Varsle når en faktura er <b>sendt</b>',
  'email_viewed' => 'Varsle når en faktura er <b>set</b>',
  'email_paid' => 'Varsle når en faktura er <b>betalt</b>',
  'site_updates' => 'Webside opdateringer',
  'custom_messages' => 'Tilpassede meldinger',
  'default_invoice_terms' => 'Sæt standard fakturavilkår',
  'default_email_footer' => 'Sæt standard e-mailsignatur',
  'import_clients' => 'Importer klientdata',
  'csv_file' => 'Vælg CSV-fil',
  'export_clients' => 'Eksporter klientdata',
  'select_file' => 'Venligst vælg en fil',
  'first_row_headers' => 'Brug første række som overskrifter',
  'column' => 'Kolonne',
  'sample' => 'Eksempel',
  'import_to' => 'Importer til',
  'client_will_create' => 'Klient vil blive oprettet',
  'clients_will_create' => 'Klienter vil blive oprettet',

  // application messages
  'created_client' => 'Klient oprettet succesfuldt',
  'created_clients' => 'Klienter oprettet succesfuldt',
  'updated_settings' => 'Indstillinger opdateret',
  'removed_logo' => 'Logo fjernet',
  'sent_message' => 'Melding sendt',
  'invoice_error' => 'Venligst vælge en klient og rette eventuelle fejl',
  'limit_clients' => 'Desværre, dette vil overstige græsen på :count klienter',
  'payment_error' => 'Det opstod en fejl under din betaling. Venligst prøv igen senere.',
  'registration_required' => 'Venligst registrer dig for at sende e-mailfaktura',
  'confirmation_required' => 'Venligst bekræft din e-mail',

  'updated_client' => 'Klient opdateret',
  'created_client' => 'Klient lagret',
  'archived_client' => 'Klient arkiveret',
  'archived_clients' => 'Arkiverede :count klienter',
  'deleted_client' => 'Klient slettet',
  'deleted_clients' => 'Slettet :count klienter',

  'updated_invoice' => 'Faktura opdateret',
  'created_invoice' => 'Faktura oprettet',
  'cloned_invoice' => 'Faktura kopieret',
  'emailed_invoice' => 'E-mailfaktura sendt',
  'and_created_client' => 'og klient oprettet',
  'archived_invoice' => 'Faktura arkiveret',
  'archived_invoices' => 'Arkiverede :count fakturaer',
  'deleted_invoice' => 'Faktura slettet',
  'deleted_invoices' => 'Slettet :count fakturaer',

  'created_payment' => 'Betaling oprettet',
  'archived_payment' => 'Betaling arkiveret',
  'archived_payments' => 'Arkiverede :count betalinger',
  'deleted_payment' => 'Betaling slettet',
  'deleted_payments' => 'Slettet :count betalinger',
  'applied_payment' => 'Betaling lagret',

  'created_credit' => 'Kredit oprettet',
  'archived_credit' => 'Kredit arkiveret',
  'archived_credits' => 'Arkiverede :count kreditter',
  'deleted_credit' => 'Kredit slettet',
  'deleted_credits' => 'Slettet :count kreditter',

  // Emails
  'confirmation_subject' => 'Invoice Ninja kontobekræftelse',
  'confirmation_header' => 'Kontobekræftelse',
  'confirmation_message' => 'Venligst åbne linket nedenfor for å bekræfte din konto.',
  'invoice_subject' => 'Ny faktura fra :account',
  'invoice_message' => 'For at se din faktura på :amount, klik på linket nedenfor.',
  'payment_subject' => 'Betaling modtaget',
  'payment_message' => 'Tak for din betaling pålydende :amount.',
  'email_salutation' => 'Kære :name,',
  'email_signature' => 'Med venlig hilsen,',
  'email_from' => 'The InvoiceNinja Team',
  'user_email_footer' => 'For at justere varslingsindstillingene venligst besøg '.SITE_URL.'/company/notifications',
  'invoice_link_message' => 'Hvis du vil se din klientfaktura klik på linket under:',
  'notification_invoice_paid_subject' => 'Faktura :invoice betalt af :client',
  'notification_invoice_sent_subject' => 'Faktura :invoice sendt til :client',
  'notification_invoice_viewed_subject' => 'Faktura :invoice set av :client',
  'notification_invoice_paid' => 'En betaling pålydende :amount blev gjort af :client for faktura :invoice.',
  'notification_invoice_sent' => 'E-mail er blevet sendt til :client - Faktura :invoice pålydende :amount.',
  'notification_invoice_viewed' => ':client har set faktura :invoice pålydende :amount.',
  'reset_password' => 'Du kan nulstille din adgangskode ved at besøge følgende link:',
  'reset_password_footer' => 'Hvis du ikke bad om at få nulstillet din adgangskode venligst kontakt kundeservice: ' . CONTACT_EMAIL,


  // Payment page
  'secure_payment' => 'Sikker betaling',
  'card_number' => 'Kortnummer',
  'expiration_month' => 'Udløbsdato',
  'expiration_year' => 'Udløbsår',
  'cvv' => 'CVV',

  // Security alerts
  'confide' => [
    'too_many_attempts' => 'For mange forsøg. Prøv igen om nogen få minutter.',
    'wrong_credentials' => 'Fejl e-mail eller adgangskode.',
    'confirmation' => 'Din konto har blevet bekræftet!',
    'wrong_confirmation' => 'Fejl bekræftelseskode.',
    'password_forgot' => 'Informationen om nulstilling af din adgangskode er blevet sendt til din e-mail.',
    'password_reset' => 'Adgangskode ændret',
    'wrong_password_reset' => 'Ugyldig adgangskode. Prøv på ny',
  ],

  // Pro Plan
  'pro_plan' => [
    'remove_logo' => ':link for å fjerne Invoice Ninja-logoen, oppgrader til en Pro Plan',
    'remove_logo_link' => 'Klik her',
  ],

  'logout' => 'Log ud',
  'sign_up_to_save' => 'Registrer dig for at gemme dit arbejde',
  'agree_to_terms' =>'Jeg acceptere Invoice Ninja :terms',
  'terms_of_service' => 'vilkår for brug',
  'email_taken' => 'E-mailadressen er allerede registreret',
  'working' => 'Arbejder',
  'success' => 'Succes',

  'success_message' => 'Du er blevet registreret. Venligst gå ind på linket som du har modtaget i e-mailbekræftelsen for at bekræfte e-mailaddressen.',
  'erase_data' => 'Dette vil permanent slette dine data.',
  'password' => 'Adgangskode',

  'pro_plan_product' => 'Pro Plan',
  'pro_plan_description' => 'Et års indmelding i Invoice Ninja Pro Plan.',
  'pro_plan_success' => 'Tak for at du valgte Invoice Ninja\'s Pro plan!<p/>&nbsp;<br/>
                          <b>De næste skridt</b><p/>En betalbar faktura er send til e-emailaddesse
                          som er tilknyttet din konto. For at låse op for alle de utrolige
                          Pro-funktioner, kan du følge instruktionerne på fakturaen til at
                          betale for et år med Pro-niveau funktionerer.<p/>
                          Kan du ikke finde fakturaen? Har behov for mere hjælp? Vi hjælper dig gerne om det skulle være noget
                          -- kontakt os på contact@invoiceninja.com',

  'unsaved_changes' => 'Du har ugemente ændringer',
  'custom_fields' => 'Egendefineret felt',
  'company_fields' => 'Selskabets felt',
  'client_fields' => 'Klientens felt',
  'field_label' => 'Felt etikette',
  'field_value' => 'Feltets værdi',
  'edit' => 'Rediger',
  'set_name' => 'Sæt dit firmanavn',
  'view_as_recipient' => 'Vis som modtager',

  // product management
  'product_library' => 'Produktbibliotek',
  'product' => 'Produkt',
  'products' => 'Produkter',
  'fill_products' => 'Automatisk-udfyld produkter',
  'fill_products_help' => 'Valg af produkt vil automatisk udfylde <b>beskrivelse og pris</b>',
  'update_products' => 'Automatisk opdatering af produkter',
  'update_products_help' => 'En opdatering af en faktura vil automatisk <b>opdaterer Produktbiblioteket</b>',
  'create_product' => 'Opret nyt produkt',
  'edit_product' => 'Rediger produkt',
  'archive_product' => 'Arkiver produkt',
  'updated_product' => 'Produkt opdateret',
  'created_product' => 'Produkt lagret',
  'archived_product' => 'Produkt arkiveret',
  'pro_plan_custom_fields' => ':link for at aktivere egendefinerede felter ved at bliver medlem af Pro Plan',

  'advanced_settings' => 'avancerede indstillinger',
  'pro_plan_advanced_settings' => ':link for at aktivere avancerede indstillinger felter ved at bliver medlem af Pro Plan',
  'invoice_design' => 'Fakturadesign',
  'specify_colors' => 'Egendefineret farve',
  'specify_colors_label' => 'Vælg farver som bruges i fakturaen',

  'chart_builder' => 'Diagram bygger',
  'ninja_email_footer' => 'Brug :sitet til at fakturere dine kunder og få betalt på nettet - gratis!',
  'go_pro' => 'Vælg Pro',

  // Quotes
  'quote' => 'Pristilbud',
  'quotes' => 'Pristilbud',
  'quote_number' => 'Tilbuds nummer',
  'quote_number_short' => 'Tilbuds #',
  'quote_date' => 'Tilbudsdato',
  'quote_total' => 'Tilbud total',
  'your_quote' => 'Dit tilbud',
  'total' => 'Total',
  'clone' => 'Kopier',

  'new_quote' => 'Nyt tilbud',
  'create_quote' => 'Gem tilbud',
  'edit_quote' => 'Rediger tilbud',
  'archive_quote' => 'Arkiver tilbud',
  'delete_quote' => 'Slet tilbud',
  'save_quote' => 'Lagre tilbud',
  'email_quote' => 'E-mail tilbudet',
  'clone_quote' => 'Kopier tilbud',
  'convert_to_invoice' => 'Konverter til en faktura',
  'view_invoice' => 'Se faktura',
  'view_client' => 'Vis klient',
  'view_quote' => 'Se tilbud',

  'updated_quote' => 'Tilbud opdatert',
  'created_quote' => 'Tilbud oprettet',
  'cloned_quote' => 'Tilbud kopieret',
  'emailed_quote' => 'Tilbud sendt som e-mail',
  'archived_quote' => 'Tilbud arkiveret',
  'archived_quotes' => 'Arkiverede :count tilbud',
  'deleted_quote' => 'Tilbud slettet',
  'deleted_quotes' => 'Slettet :count tilbud',
  'converted_to_invoice' => 'Tilbud konverteret til faktura',

  'quote_subject' => 'Nyt tilbud fra :account',
  'quote_message' => 'For å se dit tilbud pålydende :amount, klik på linket nedenfor.',
  'quote_link_message' => 'Hvis du vil se din klients tilbud, klik på linket under:',
  'notification_quote_sent_subject' => 'Tilbud :invoice sendt til :client',
  'notification_quote_viewed_subject' => 'Tilbudet :invoice er set af :client',
  'notification_quote_sent' => 'Følgende klient :client blev sendt tilbudsfaktura :invoice pålydende :amount.',
  'notification_quote_viewed' => 'Følgende klient :client har set tilbudsfakturaen :invoice pålydende :amount.',

  'session_expired' => 'Session er udløbet.',

  'invoice_fields' => 'Faktura felt',
  'invoice_options' => 'Faktura alternativer',
  'hide_quantity' => 'Skjul antal',
  'hide_quantity_help' => 'Hvis du altid kun har 1 som antal på dine fakturalinjer på fakturaen, kan du vælge ikke at vise antal på fakturaen.',
  'hide_paid_to_date' => 'Skjul delbetalinger',
  'hide_paid_to_date_help' => 'Vis kun delbetalinger hvis der er forekommet en delbetaling.',

  'charge_taxes' => 'Inkluder skat',
  'user_management' => 'Brugerhåndtering',
  'add_user' => 'Tilføj bruger',
  'send_invite' => 'Send invitation',
  'sent_invite' => 'Invitation sendt',
  'updated_user' => 'Bruger opdateret',
  'invitation_message' => 'Du har blevet inviteret af :invitor. ',
  'register_to_add_user' => 'Venligst registrer dig for at oprette en bruger',
  'user_state' => 'Status',
  'edit_user' => 'Rediger bruger',
  'delete_user' => 'Slet bruger',
  'active' => 'Aktiv',
  'pending' => 'Afventer',
  'deleted_user' => 'Bruger slettet',
  'limit_users' => 'Desværre, vil dette overstiger grænsen på ' . MAX_NUM_USERS . ' brugere',

  'confirm_email_invoice' => 'Er du sikker på at du vil sende denne faktura?',
  'confirm_email_quote' => 'Er du sikker på du ville sende dette tilbud?',
  'confirm_recurring_email_invoice' => 'Gentagende er slået til, er du sikker på du vil have denne faktura sendt?',

  'cancel_account' => 'Annuller konto',
  'cancel_account_message' => 'Advarsel: Dette ville slette alle dine data og kan ikke omgøres',
  'go_back' => 'Go Back',

  'data_visualizations' => 'Data visualisering',
  'sample_data' => 'Eksempel data vis',
  'hide' => 'Skjul',
  'new_version_available' => 'En ny version af :releases_link er tilgængelig. Din nuværende version er v:user_version, den nyeste version er v:latest_version',

  'invoice_settings' => 'Faktura indstillinger',
  'invoice_number_prefix' => 'Faktura nummer præfiks',
  'invoice_number_counter' => 'Faktura nummer tæller',
  'quote_number_prefix' => 'Tilbuds nummer præfiks',
  'quote_number_counter' => 'Tilbuds nummer tæller',
  'share_invoice_counter' => 'Del faktura nummer tæller',
  'invoice_issued_to' => 'Faktura udstedt til',
  'invalid_counter' => 'For at undgå mulige overlap, sæt venligst et faktura eller tilbuds nummer præfiks',
  'mark_sent' => 'Marker som sendt',

  'gateway_help_1' => ':link to sign up for Authorize.net.',
  'gateway_help_2' => ':link to sign up for Authorize.net.',
  'gateway_help_17' => ':link to get your PayPal API signature.',
  'gateway_help_23' => 'Note: use your secret API key, not your publishable API key.',
  'gateway_help_27' => ':link to sign up for TwoCheckout.',

  'more_designs' => 'More designs',
  'more_designs_title' => 'Additional Invoice Designs',
  'more_designs_cloud_header' => 'Go Pro for more invoice designs',
  'more_designs_cloud_text' => '',
  'more_designs_self_host_header' => 'Get 6 more invoice designs for just $'.INVOICE_DESIGNS_PRICE,
  'more_designs_self_host_text' => '',
  'buy' => 'Buy',
  'bought_designs' => 'Successfully added additional invoice designs',
  
  'sent' => 'sent',
  'timesheets' => 'Timesheets',

  'payment_title' => 'Enter Your Billing Address and Credit Card information',
  'payment_cvv' => '*This is the 3-4 digit number onthe back of your card',
  'payment_footer1' => '*Billing address must match address associated with credit card.',
  'payment_footer2' => '*Please click "PAY NOW" only once - transaction may take up to 1 minute to process.',

  'id_number' => 'ID Number',
  'white_label_link' => 'White label',
  'white_label_text' => 'Purchase a white label license for $'.WHITE_LABEL_PRICE.' to remove the Invoice Ninja branding from the top of the client pages.',
  'white_label_header' => 'White Label',
  'bought_white_label' => 'Successfully enabled white label license',
  'white_labeled' => 'White labeled',

  'restore' => 'Restore',
  'restore_invoice' => 'Restore Invoice',
  'restore_quote' => 'Restore Quote',
  'restore_client' => 'Restore Client',
  'restore_credit' => 'Restore Credit',
  'restore_payment' => 'Restore Payment',

  'restored_invoice' => 'Successfully restored invoice',
  'restored_quote' => 'Successfully restored quote',
  'restored_client' => 'Successfully restored client',
  'restored_payment' => 'Successfully restored payment',
  'restored_credit' => 'Successfully restored credit',
  
  'reason_for_canceling' => 'Help us improve our site by telling us why you\'re leaving.',
  'discount_percent' => 'Percent',
  'discount_amount' => 'Amount',

  'invoice_history' => 'Invoice History',
  'quote_history' => 'Quote History',
  'current_version' => 'Current version',
  'select_versiony' => 'Select version',
  'view_history' => 'View History',

  'edit_payment' => 'Edit Payment',
  'updated_payment' => 'Successfully updated payment',
  'deleted' => 'Deleted',
  'restore_user' => 'Restore User',
  'restored_user' => 'Successfully restored user',
  'show_deleted_users' => 'Show deleted users',
  'email_templates' => 'Email Templates',
  'invoice_email' => 'Invoice Email',
  'payment_email' => 'Payment Email',
  'quote_email' => 'Quote Email',
  'reset_all' => 'Reset All',
  'approve' => 'Approve',  

  'token_billing_type_id' => 'Token Billing',
  'token_billing_help' => 'Enables you to store credit cards with your gateway, and charge them at a later date.',
  'token_billing_1' => 'Disabled',
  'token_billing_2' => 'Opt-in - checkbox is shown but not selected',
  'token_billing_3' => 'Opt-out - checkbox is shown and selected',
  'token_billing_4' => 'Always',
  'token_billing_checkbox' => 'Store credit card details',
  'view_in_stripe' => 'View in Stripe',
  'use_card_on_file' => 'Use card on file',
  'edit_payment_details' => 'Edit payment details',
  'token_billing' => 'Save card details',
  'token_billing_secure' => 'The data is stored securely by :stripe_link',

  'support' => 'Support',
  'contact_information' => 'Contact information',
  '256_encryption' => '256-Bit Encryption',
  'amount_due' => 'Amount due',
  'billing_address' => 'Billing address',
  'billing_method' => 'Billing method',
  'order_overview' => 'Order overview',
  'match_address' => '*Address must match address associated with credit card.',
  'click_once' => '*Please click "PAY NOW" only once - transaction may take up to 1 minute to process.',

  'default_invoice_footer' => 'Set default invoice footer',
  'invoice_footer' => 'Invoice footer',
  'save_as_default_footer' => 'Save as default footer',

  'token_management' => 'Token Management',
  'tokens' => 'Tokens',
  'add_token' => 'Add Token',
  'show_deleted_tokens' => 'Show deleted tokens',
  'deleted_token' => 'Successfully deleted token',
  'created_token' => 'Successfully created token',
  'updated_token' => 'Successfully updated token',
  'edit_token' => 'Edit Token',
  'delete_token' => 'Delete Token',
  'token' => 'Token',

  'add_gateway' => 'Add Gateway',
  'delete_gateway' => 'Delete Gateway',
  'edit_gateway' => 'Edit Gateway',
  'updated_gateway' => 'Successfully updated gateway',
  'created_gateway' => 'Successfully created gateway',
  'deleted_gateway' => 'Successfully deleted gateway',
  'pay_with_paypal' => 'PayPal',
  'pay_with_card' => 'Credit card',

  'change_password' => 'Change password',
  'current_password' => 'Current password',
  'new_password' => 'New password',
  'confirm_password' => 'Confirm password',
  'password_error_incorrect' => 'The current password is incorrect.',
  'password_error_invalid' => 'The new password is invalid.',
  'updated_password' => 'Successfully updated password',

  'api_tokens' => 'API Tokens',
  'users_and_tokens' => 'Users & Tokens',
  
);
