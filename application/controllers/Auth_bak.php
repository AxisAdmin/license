<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Auth extends CI_Controller
{
	function __construct(){
		parent::__construct();
//		date_default_timezone_set("Asia/Seoul");
		$this->allow = array('login', 'proclogin');
		$this->load->model('Spauth_model');

		/* 사용가능한 IP ############################################################################# */
		$correct_ip = array(
//			"121.66.106.34",	//axissoft 본사
			"112.217.163.114",	//axissoft 본사 고정IP변경 2018-06-01
//			"58.121.169.91"		//kimcody 영등포
		);

		//인증된 IP인경우 자동로그인처리.
		if(in_array($_SERVER['HTTP_X_FORWARDED_FOR'], $correct_ip)){
			$this->session->set_userdata('sessAxissoft', hash("sha256", 'AXISAUTHAUTO'));
			//db01f439585c8900823d7eb8fa7eee7bf83a86589905ad170251114173714435
		}
//		if(in_array($_SERVER['REMOTE_ADDR'], $correct_ip)){
//			$this->session->set_userdata('sessAxissoft', hash("sha256", 'AXISAUTHAUTO'));
//			//db01f439585c8900823d7eb8fa7eee7bf83a86589905ad170251114173714435
//		}



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
		$this->blist();
	}

	//로그인
	function login(){
		if($this->sessAxissoft)		redirect('/auth');
		else						$this->load->view('Spauth_login');
	}

	//로그아웃
	function logout(){
		$this->session->sess_destroy();
		redirect('/auth');
	}

	//로그인 처리
	function proclogin(){
		//비교 db와
		$pass = hash("sha256", $this->input->post('axissoft'));
//		echo "<pre>"; print_r($pass); echo "</pre>";
		if($pass == "75a8602414a6cded025c4285b43173f42390acbef5bdf2a8a5199ac54dda5829"){
			$this->session->set_userdata('sessAxissoft', hash("sha256", 'AXISAUTH'));
			redirect('/auth');
		}else{
			$this->session->set_flashdata('message','로그인 정보가 다릅니다.');
			redirect('/auth/login');
		}
	}

	//리스트
	function blist(){
		$perpage = 20;
		$curpage = $this->uri->segment(4, 0);
		$searchid = $this->uri->segment(6, "license_code");
		$searchtxt = urldecode($this->uri->segment(8, null));
		$args = array('curpage' => $curpage, 'perpage'=>$perpage, 'searchid' => $searchid, 'searchtxt' => $searchtxt);

    //페이지네이션 설정
		$this->load->library("pagination");
		$config['num_links'] = 2;
		$config['uri_segment'] = 4;
		$config['base_url'] = '/auth/blist/page';
		$config['suffix'] = '/searchid/'.$searchid.'/searchtxt/'.$searchtxt;
		$config['first_url'] = $config['base_url'].'/0'. $config['suffix'];
		$config['total_rows'] = $this->Spauth_model->get_total_row($args);
		$config['per_page'] = $perpage;
		$this->pagination->initialize($config);
		$pagination = $this->pagination->create_links();
		$data = $this->Spauth_model->get_list($args);

		$this->load->view('Spauth_list', array('data'=>$data, 'pagination'=>$pagination, 'curpage'=>$curpage,'searchid' => $searchid, 'searchtxt'=>$searchtxt));
	}

	//상세페이지(등록, 수정)
	function bregister(){
		$arr_uri = $this->uri->uri_to_assoc(3);
		$curpage = $arr_uri['page'] ? : 0;

		$args['license_code'] = isset($arr_uri['license_code']) ? $arr_uri['license_code'] : $this->Spauth_model->get_GUID();
		$data = $this->Spauth_model->get_view($args);

		$mode = "insert";
		if($data)	$mode = "update";

		$this->load->view('Spauth_view', array('license_code'=>$args['license_code'], 'mode'=>$mode, 'data'=>$data, 'curpage'=>$curpage));
	}

	//입력처리
	function procregister(){
		$mode = $this->input->post('mode');
		$is_unique = $mode == 'insert' ? '|is_unique[spauth.license_code]' : '';
		$this->load->library("form_validation");
		$this->form_validation->set_rules('license_code','라이센스','trim|required|alpha_dash|min_length[36]|max_length[36]'.$is_unique);
		$this->form_validation->set_rules('company_name','회사명','trim|required');
		$this->form_validation->set_rules('service_name','서비스명','trim|required');
		$this->form_validation->set_rules('service_domain','서비스도메인','trim|required|valid_url');
		$this->form_validation->set_rules('app_event','APP 이벤트','trim|required|valid_url');
		$this->form_validation->set_rules('scms_url','SCMS URL','trim|valid_url');
		$this->form_validation->set_rules('mp3_enable','음원서비스','required');
		$this->form_validation->set_rules('enable','상태','required');

		if($this->form_validation->run() === true){
			$form = array();
			foreach($this->input->post(NULL) as $key => $val) $form["{$key}"] = $val;

			$config['encrypt_name'] = false;
			$config['file_ext_tolower'] = true;
			$config['max_filename_increment'] = 999999;
			$config['upload_path'] = FCPATH.'files/';
			$config['allowed_types'] = 'jpg|png|gif';
			$config['max_size']	= '1024';
			$config['max_width']  = '1920';
			$config['max_height']  = '1080';

//		echo "<pre>"; print_r($_FILES); echo "</pre>";
//		exit;

			$this->load->library('upload');
			foreach($_FILES as $key=>$val){
				if($val['error'] != 4){	//파일이 없지 않으면
					$config['file_name'] = $key;
					$this->upload->initialize($config);

					if (! $this->upload->do_upload($key))
					{
						$error = strip_quotes(strip_tags($this->upload->display_errors()));
						$this->session->set_flashdata('message','['.$key.'] '.$error);

						redirect('/auth/blist', 'refresh');
						exit;

					}else{
						$upload_data[$key] = $this->upload->data();
					}
				}
			}

			$args = array('data'=> $form);
			if(isset($upload_data))	$args['files'] =  $upload_data;

			$result = $this->Spauth_model->set_regist($args);

			if($result)	$msg = '정상 등록 되었습니다.';
			else				$msg = '에러가 발생 했습니다.';

			$this->session->set_flashdata('message',$msg);
			redirect('/auth', 'refresh');

		}else{
			$this->load->view('Spauth_view', array( 'data'=>'', 'mode'=>$mode, 'curpage'=>0));
		}

	}

	//삭제
	function bdelete(){
		$args = array('license_code'=>$this->input->get('license_code'));
		if($args){
			$this->Spauth_model->set_delete($args);
			$this->session->set_flashdata('message','삭제 완료 하였습니다.');
		}

		redirect('/auth');
	}

	//파일다운로드
	function getfile(){
		$filepath = $this->input->get('file');
		$filename = explode("/",$filepath);
		$filename = end($filename);
		$file = FCPATH.'files/'.$filepath;
		$filesize = filesize($file);

//		echo "<pre>"; print_r($filepath); echo "</pre>";
//		echo "<pre>"; print_r($filesize); echo "</pre>";
//		exit;

		Header("Content-Type: file/unknown");
		Header("Content-Length: ".$filesize);
		Header("Content-Disposition: attachment; filename=".$filename);
		Header("Content-Transfer-Encoding: binary");
		Header("Pragma: no-cache");
		Header("Expires: 0");

		readfile($file);
	}
}