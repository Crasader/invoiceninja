<?php

return array(

	/*
	|--------------------------------------------------------------------------
	| Validation Language Lines
	|--------------------------------------------------------------------------
	|
	| The following language lines contain the default error messages used by
	| the validator class. Some of these rules have multiple versions such
	| such as the size rules. Feel free to tweak each of these messages.
	|
	*/

	"accepted"         => ":attribute m� v�re akseptert.",
	"active_url"       => ":attribute er ikke en gyldig URL.",
	"after"            => ":attribute m� v�re en dato etter :date.",
	"alpha"            => ":attribute kan kun inneholde bokstaver.",
	"alpha_dash"       => ":attribute kan kun inneholde bokstaver, sifre, og bindestreker.",
	"alpha_num"        => ":attribute kan kun inneholde bokstaver og sifre.",
	"array"            => ":attribute m� v�re en matrise.",
	"before"           => ":attribute m� v�re en dato f�r :date.",
	"between"          => array(
		"numeric" => ":attribute m� v�re mellom :min - :max.",
		"file"    => ":attribute m� v�re mellom :min - :max kilobytes.",
		"string"  => ":attribute m� v�re mellom :min - :max tegn.",
		"array"   => ":attribute m� ha mellom :min - :max elementer.",
	),
	"confirmed"        => ":attribute bekreftelsen stemmer ikke",
	"date"             => ":attribute er ikke en gyldig dato.",
	"date_format"      => ":attribute samsvarer ikke med formatet :format.",
	"different"        => ":attribute og :other m� v�re forskjellig.",
	"digits"           => ":attribute m� v�re :digits sifre.",
	"digits_between"   => ":attribute m� v�re mellom :min og :max sifre.",
	"email"            => ":attribute formatet er ugyldig.",
	"exists"           => "Valgt :attribute er ugyldig.",
	"image"            => ":attribute m� v�re et bilde.",
	"in"               => "Valgt :attribute er ugyldig.",
	"integer"          => ":attribute m� v�re heltall.",
	"ip"               => ":attribute m� v�re en gyldig IP-adresse.",
	"max"              => array(
		"numeric" => ":attribute kan ikke v�re h�yere enn :max.",
		"file"    => ":attribute kan ikke v�re st�rre enn :max kilobytes.",
		"string"  => ":attribute kan ikke v�re mer enn :max tegn.",
		"array"   => ":attribute kan ikke inneholde mer enn :max elementer.",
	),
	"mimes"            => ":attribute m� v�re av filtypen: :values.",
	"min"              => array(
		"numeric" => ":attribute m� minimum v�re :min.",
		"file"    => ":attribute m� minimum v�re :min kilobytes.",
		"string"  => ":attribute m� minimum v�re :min tegn.",
		"array"   => ":attribute m� inneholde minimum :min elementer.",
	),
	"not_in"           => "Valgt :attribute er ugyldig.",
	"numeric"          => ":attribute m� v�re et siffer.",
	"regex"            => ":attribute formatet er ugyldig.",
	"required"         => ":attribute er p�krevd.",
	"required_if"      => ":attribute er p�krevd n�r :other er :value.",
	"required_with"    => ":attribute er p�krevd n�r :values er valgt.",
	"required_without" => ":attribute er p�krevd n�r :values ikke er valgt.",
	"same"             => ":attribute og :other m� sammsvare.",
	"size"             => array(
		"numeric" => ":attribute m� v�re :size.",
		"file"    => ":attribute m� v�re :size kilobytes.",
		"string"  => ":attribute m� v�re :size tegn.",
		"array"   => ":attribute m� inneholde :size elementer.",
	),
	"unique"           => ":attribute er allerede blitt tatt.",
	"url"              => ":attribute formatet er ugyldig.",
	
	"positive" => ":attribute m� v�re mer enn null.",
	"has_credit" => "Klienten har ikke h�y nok kreditt.",
	"notmasked" => "Verdiene er skjult",

	/*
	|--------------------------------------------------------------------------
	| Custom Validation Language Lines
	|--------------------------------------------------------------------------
	|
	| Here you may specify custom validation messages for attributes using the
	| convention "attribute.rule" to name the lines. This makes it quick to
	| specify a specific custom language line for a given attribute rule.
	|
	*/

	'custom' => array(),

	/*
	|--------------------------------------------------------------------------
	| Custom Validation Attributes
	|--------------------------------------------------------------------------
	|
	| The following language lines are used to swap attribute place-holders
	| with something more reader friendly such as E-Mail Address instead
	| of "email". This simply helps us make messages a little cleaner.
	|
	*/

	'attributes' => array(),

);
