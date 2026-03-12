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
//		if($pass == "75a8602414a6cded025c4285b43173f42390acbef5bdf2a8a5199ac54dda5829"){
		if($pass == "46b98260583701cea61dd28d8ee26af8f40df615d18da2f287057f45a23aabe3"){
			//7173450a@
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
		$curpage = $arr_uri['page'] ? $arr_uri['page'] : 0;
		$searchid = isset($arr_uri['searchid']) ? $arr_uri['searchid'] : '';
		$searchtxt = isset($arr_uri['searchtxt']) ? $arr_uri['searchtxt'] : '';

		$args['license_code'] = isset($arr_uri['license_code']) ? $arr_uri['license_code'] : $this->Spauth_model->get_GUID();
		$data = $this->Spauth_model->get_view($args);

		$mode = "insert";
		if($data)	$mode = "update";

		$this->load->view('Spauth_view', array('license_code'=>$args['license_code'], 'mode'=>$mode, 'data'=>$data, 'curpage'=>$curpage, 'searchid'=>$searchid, 'searchtxt'=>$searchtxt));
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
		$this->form_validation->set_rules('spkid','spkid','trim');
		$this->form_validation->set_rules('pc_download_yn','PC 다운로드 사용여부','trim|required');
		$this->form_validation->set_rules('pc_config_url','PC config url','trim|valid_url');
		$this->form_validation->set_rules('pc_history_url','PC 수강이력 url','trim|valid_url');
		$this->form_validation->set_rules('pc_only_online','PC 온라인전용여부','trim|required');
		$this->form_validation->set_rules('pc_watermark_yn','PC 워터마크 사용여부','trim');
		$this->form_validation->set_rules('pc_watermark_interval','PC 워터마크 노출간격','trim');
		$this->form_validation->set_rules('pc_watermark_duration','PC 워터마크 노출시간','trim');
		$this->form_validation->set_rules('pc_site_color','PC 사이트 컬러값','trim');

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
			$conn_id = null;

			$this->load->library('upload');
			foreach($_FILES as $key=>$val){
//				echo "<pre>"; print_r($key); echo "</pre>";
//				echo "<pre>"; print_r($val); echo "</pre>";
//				exit;
				if($val['error'] != 4){	//파일이 없지 않으면
					$config['file_name'] = $key;





					$file = $_FILES[$key]['name'];
					$pos = strrpos($file, '.');
					$filename  = substr($file, 0, $pos);
					$extension = strtolower(substr($file, $pos, strlen($file) - $pos));

					$gConf["ftp_server"] = "iup.cdn3.cafe24.com";
					$gConf["ftp_port"] = "21";
					$gConf["ftp_user"] = "axissoft1";
					$gConf["ftp_pass"] = "axis7!73450";
					$gConf['ftp_path'] = "web/images";

					$conn_id = ftp_connect($gConf["ftp_server"], $gConf["ftp_port"]);

					// login with username and password
					$login_result = ftp_login($conn_id, $gConf["ftp_user"], $gConf["ftp_pass"]);

					// check connection
					if ((!$conn_id) || (!$login_result)) {
						$this->session->set_flashdata('message','Attempted to connect to ftp_server');
						redirect('/auth/blist', 'refresh');
						die;
					} else {
						ftp_pasv($conn_id, true);  // 이거 없으면 업로드 안됨. 검색 보면 없이 하는곳도
					}


					//중복체크용
					$contents = ftp_nlist($conn_id, $gConf['ftp_path']);

					for ($i = 200; $i < $config['max_filename_increment']; $i++)
					{
						if (!in_array($gConf['ftp_path'].'/'.$key.$i.$extension, $contents))
						{
							$new_filename = $key.$i.$extension;
							break;
						}
					}

					/* ftp_put($conn_id, 원격서버에 업로드될 파일명, 현재 서버의 파일명, 모드) */
					$upload = ftp_put($conn_id, $gConf['ftp_path'].'/'.$new_filename, $_FILES[$key]["tmp_name"], FTP_BINARY);

					// check upload status
					if (!$upload) {
						$this->session->set_flashdata('message','Ftp upload has failed!');
						redirect('/auth/blist', 'refresh');
						die;
					} else {
						$upload_data[$key]['file_name'] = $new_filename;
					}


//					$this->upload->initialize($config);
//
//					if (! $this->upload->do_upload($key))
//					{
//						$error = strip_quotes(strip_tags($this->upload->display_errors()));
//						$this->session->set_flashdata('message','['.$key.'] '.$error);
//
//						redirect('/auth/blist', 'refresh');
//						exit;
//
//					}else{
//						$upload_data[$key] = $this->upload->data();
//					}
				}
			}

			// close the FTP stream
			if($conn_id)	ftp_quit($conn_id);

			$args = array('data'=> $form);
			if(isset($upload_data))	$args['files'] =  $upload_data;

			$result = $this->Spauth_model->set_regist($args);

			if($result)	$msg = '정상 등록 되었습니다.';
			else				$msg = '에러가 발생 했습니다.';
			$this->session->set_flashdata('message',$msg);

			$curpage = $this->input->post('curpage');
			$searchid = $this->input->post('searchid');
			$searchtxt = urlencode($this->input->post('searchtxt'));
			redirect('auth/blist/page/'.$curpage.'/searchid/'.$searchid.'/searchtxt/'.$searchtxt, 'refresh');

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
//		$file = FCPATH.'files/'.$filepath;
		$file = 'http://axissoft1.cdn3.cafe24.com/web/images/'.$filename;
		$filesize = $this->getSizeFile($file);

//      $filesize = filesize($file);
//		echo "<pre>"; print_r($filename); echo "</pre>";
//		echo "<pre>"; print_r($filesize); echo "</pre>";
//		exit;

		if ($filesize) {
			Header("Content-Type: file/unknown");
			Header("Content-Length: ".$filesize);
			Header("Content-Disposition: attachment; filename=".$filename);
			Header("Content-Transfer-Encoding: binary");
			Header("Pragma: no-cache");
			Header("Expires: 0");

			$fp = fopen($file, "rb");
		    fpassthru($fp);
		    fclose($fp);

		} else {
			echo '해당 파일이 없습니다.';
			exit;
		}
	}

	function getSizeFile($url) {
    if (substr($url, 0, 4) == 'http') {
      $x = array_change_key_case(get_headers($url, 1), CASE_LOWER);

      if (strcasecmp($x[0], 'HTTP/1.1 200 OK') != 0) {
        $x = false;
      } else {
        $x = $x['content-length'];
      }
    } else {
      $x = @filesize($url);
    }

    return $x;
  }
}