<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Token extends CI_Controller
{
	function __construct(){
        parent::__construct();
//		date_default_timezone_set("Asia/Seoul");

//		$this->allow = array('login', 'proclogin');
		$this->load->helper(array('form', 'url'));
		$this->load->library('session');
//		$this->load->model('Spauth_model');

		/* 사용가능한 IP ############################################################################# */
		$correct_ip = array(
			"106.245.166.114",	//axissoft 본사 IP변경 2017-06-28 (기존 121.66.106.34)
//			"58.121.169.91"		//kimcody 영등포
		);

		//인증된 IP인경우 자동로그인처리.
		if(in_array($_SERVER['REMOTE_ADDR'], $correct_ip)){
			$this->session->set_userdata('sessAxissoft', hash("sha256", 'AXISAUTHAUTO'));
			//db01f439585c8900823d7eb8fa7eee7bf83a86589905ad170251114173714435
		}

		$this->sessAxissoft = $this->session->userdata('sessAxissoft');
		/* 사용가능한 IP ############################################################################# */
    }

	public function _remap($method){
		$this->load->view('Spauth_header', array('sessAxissoft'=>$this->sessAxissoft));

		if (method_exists($this, $method)) {
			$this->{"{$method}"}();
		}

		$this->load->view('Spauth_footer');
	}

	//index > 로그인
	public function index(){
		$this->load->view('Spauth_login');
	}

	//로그인
//	function login(){
//		if($this->sessAxissoft)		redirect('/token');
//		else						$this->load->view('Spauth_login');
//	}

	//로그아웃
	function logout(){
		$this->session->sess_destroy();
		redirect('/token');
	}

	//로그인 처리
	function proclogin(){
		//비교 db와
		$pass = hash("sha256", $this->input->post('axissoft'));
//		echo "<pre>"; print_r($pass); echo "</pre>";
		if($pass == "75a8602414a6cded025c4285b43173f42390acbef5bdf2a8a5199ac54dda5829"){
			$this->session->set_userdata('sessAxissoft', hash("sha256", 'AXISAUTH'));
			redirect('/token');
		}else{
			$this->session->set_flashdata('message','로그인 정보가 다릅니다.');
			redirect('/token/login');
		}
	}

}