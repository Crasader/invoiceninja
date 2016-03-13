<?php namespace app\Http\Requests;

use Auth;
use App\Http\Requests\Request;
use Illuminate\Http\Request as InputRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Factory;
use App\Libraries\Utils;
use Response;

class RegisterRequest extends Request
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */

    public function __construct(InputRequest $req)
    {
        $this->req = $req;

    }


    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {

        $rules = [
            'email' => 'required|unique:users',
            'first_name' => 'required',
            'last_name' => 'required',
            'password' => 'required',
        ];

        return $rules;
    }

    public function response(array $errors)
    {

        Log::info($this->req->api_secret);
        Log::info($this->req->email);

        if(!isset($this->req->api_secret))
            return parent::response($errors);

        Log::info($errors);

        foreach($errors as $err) {
            foreach ($err as $key => $value) {

                Log::info($err);
                Log::info($key);
                Log::info($value);

                $error['error'] = ['message'=>$value];
                $error = json_encode($error, JSON_PRETTY_PRINT);
                $headers = Utils::getApiHeaders();

                return Response::make($error, 400, $headers);
            }
        }
    }



    public function setRequest($request)
    {
        $this->request = $request;
    }

    public function getRequest()
    {
        return $this->request;
    }


}
