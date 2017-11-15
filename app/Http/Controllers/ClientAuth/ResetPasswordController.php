<?php

namespace App\Http\Controllers\ClientAuth;

use Password;
use Config;
use App\Models\PasswordReset;
use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\ResetsPasswords;
use Illuminate\Http\Request;
use App\Models\PasswordReset;

class ResetPasswordController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Password Reset Controller
    |--------------------------------------------------------------------------
    |
    | This controller is responsible for handling password reset requests
    | and uses a simple trait to include this behavior. You're free to
    | explore this trait and override any methods you wish to tweak.
    |
    */

    use ResetsPasswords;

    /**
     * Where to redirect users after resetting their password.
     *
     * @var string
     */
    protected $redirectTo = '/client/dashboard';

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest:client');

        //Config::set('auth.defaults.passwords', 'client');
    }

    protected function broker()
    {
        return Password::broker('clients');
    }

    protected function guard()
    {
        return auth()->guard('client');
    }

    public function showResetForm(Request $request, $token = null)
    {
        $passwordReset = PasswordReset::whereToken($token)->first();

        if (! $passwordReset) {
            return redirect('login')->withMessage(trans('texts.invalid_code'));
        }

        return view('clientauth.passwords.reset')->with(
            ['token' => $token, 'email' => $passwordReset->email]
        );
    }

}
