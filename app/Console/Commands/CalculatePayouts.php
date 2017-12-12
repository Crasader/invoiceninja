<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DbServer;
use App\Models\User;
use App\Models\Company;
use App\Libraries\CurlUtils;

class CalculatePayouts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ninja:calculate-payouts {--type=} {--url=} {--password=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculate payouts';


    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $this->info('Running CalculatePayouts...');
        $type = strtolower($this->option('type'));

        switch ($type) {
            case 'referral':
                $this->referralPayouts();
                break;
            case 'reseller':
                $this->resellerPayouts();
                break;
        }
    }

    private function referralPayouts()
    {
        $servers = DbServer::orderBy('id')->get(['name']);
        $userMap = [];

        foreach ($servers as $server) {
            $this->info('Processing users: ' . $server->name);
            config(['database.default' => $server->name]);

            $users = User::where('referral_code', '!=', '')
                ->get(['email', 'referral_code']);
            foreach ($users as $user) {
                $userMap[$user->referral_code] = $user->email;
            }
        }

        foreach ($servers as $server) {
            $this->info('Processing companies: ' . $server->name);
            config(['database.default' => $server->name]);

            $companies = Company::where('referral_code', '!=', '')
                ->with('payment.client.payments')
                ->whereNotNull('payment_id')
                ->get();

            foreach ($companies as $company) {
                $user = $userMap[$company->referral_code];
                $payment = $company->payment;
                $client = $payment->client;

                $this->info("User: $user");

                foreach ($client->payments as $payment) {
                    $amount = $payment->getCompletedAmount();
                    $this->info("Date: $payment->payment_date, Amount: $amount, Reference: $payment->transaction_reference");
                }
            }
        }
    }

    private function resellerPayouts()
    {
        $response = CurlUtils::post($this->option('url') . '/reseller_stats', [
            'password' => $this->option('password')
        ]);

        $this->info('Response:');
        $this->info($response);
    }

    protected function getOptions()
    {
        return [
            ['type', null, InputOption::VALUE_OPTIONAL, 'Type', null],
            ['url', null, InputOption::VALUE_OPTIONAL, 'Url', null],
            ['password', null, InputOption::VALUE_OPTIONAL, 'Password', null],
        ];
    }

}
