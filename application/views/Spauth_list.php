<script type="text/javascript">
	function js_del(cd){
		if(confirm('정말 삭제 하시겠습니까?')){
			location.href='/auth/bdelete?license_code='+cd;
		}
	}

	function search(){
		if(!document.getElementsByName("searchtxt")[0].value){
			alert('검색어를 입력하세요.');
			return;
		}
		location.href="/auth/blist/page/0/searchid/"+document.getElementsByName("searchid")[0].value+"/searchtxt/"+document.getElementsByName("searchtxt")[0].value;
	}
</script>

<div style="padding:10px 0;">
	<h4>등록된 라이선스</h4>
	<span>
		등록 신청을 한 자료들의 목록 중 상태가 "등록" 인것이 신청 완료가 된 것입니다.<br/>
		등록 완료가 된 라이선스는 스타플레이어 모바일을 통해 배포를 하실 수 있습니다.
	</span>
</div>
<div>
	<table class="bady_001" border="0" cellspacing="0" cellpadding="0">
		<colgroup>
			<col width="60"  />
			<col width="150" />
			<col width="*"   />
			<col width="270" />
			<col width="140" />
			<col width="140" />
		</colgroup>
		<thead>
		<tr>
			<th scope="col">상태</th>
			<th scope="col">회사명</th>
			<th scope="col">서비스명</th>
			<th scope="col">라이선스</th>
			<th scope="col">등록일</th>
			<th scope="col">수정일</th>
<!--        <th>삭제</th> -->
		</tr>
		</thead>

		<tbody>
		<?php if($data): foreach($data as $item): ?>
		<tr>
			<td class='mid'><?=$item->enable == 'Y' ? '등록' : '<span class="status">정지</span>'?></td>
			<td><?=$item->company_name?></td>
			<td><?=$item->service_name?></td>
			<td><a href="/auth/bregister/page/<?=$curpage?>/license_code/<?=$item->license_code?>/searchid/<?=$searchid?>/searchtxt/<?=$searchtxt?>"><?=$item->license_code?></td>
			<td><?=date('Y-m-d H:i:s', strtotime($item->regdate))?></td>
			<td><?=date('Y-m-d H:i:s', strtotime($item->updated_date))?></td>
			<!--<td>
				<div class="mid">
					<button type="button" class="btn btn-default" onclick="js_del('<?=$item->license_code?>');">Delete</button>
				</div>
			</td>-->
		</tr>
		<?php endforeach; endif; ?>
		</tbody>
	</table>
	<div class="search_area">
		<select type="text" name="searchid" style="vertical-align: middle;height:21px;font-size:12px;">
			<option value="license_code" <?php if($searchid == 'license_code') echo 'selected'; ?>>라이선스</option>
			<option value="service_name" <?php if($searchid == 'service_name') echo 'selected'; ?>>서비스명</option>
			<option value="company_name" <?php if($searchid == 'company_name') echo 'selected'; ?>>회사명</option>
			<option value="service_domain" <?php if($searchid == 'service_domain') echo 'selected'; ?>>도메인</option>
			<option value="comment" <?php if($searchid == 'comment') echo 'selected'; ?>>코멘트</option>
		</select>
		<input type="text" name="searchtxt" value="<?php echo $searchtxt;?>" style="vertical-align: middle;width:150px;"/>
		<button type="button" class="button_sm gry" onclick="search();" style="vertical-align: middle;">검색</button>
	</div>
	<div class="btn_area">
		<button type="button" class="button" onclick="location.href='/auth/bregister/page/<?=$curpage?>';">신규</button>
	</div>
	<div class="navi"><?=$pagination?></div>
</div>