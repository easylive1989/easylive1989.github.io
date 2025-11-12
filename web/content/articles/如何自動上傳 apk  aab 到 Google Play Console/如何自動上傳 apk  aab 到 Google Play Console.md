# 如何自動上傳 apk / aab 到 Google Play Console

新增時間: November 09, 2025 06:30 AM
最後編輯時間: November 09, 2025 06:30 AM
id: 2a68303f78f7803299dacf8f20395908

![](2a68303f-78f7-802f-a72c-cfbae10565d9.png)

延續[上一篇](https://easylive1989.medium.com/%E5%A6%82%E4%BD%95%E7%94%A8-github-action-%E5%BB%BA%E7%BD%AE-flutter-android-app-98211d894e07)展示了如何自動建置 app bundle，這篇主要想記錄一下如何用 Google Play Developer Api 上傳 app bundle 到測試環境或生產環境。主要是利用 google 提供的 python 套件，搭配 Google Play Developer Api，完成上傳 app bundle 並調整釋出相關的設定。 

## 第一步

在開始使用 Api 之前，我們需要先取得 Api 的使用權限。從 Google Play Console 建立 Service Account，並授與相關權限，讓 script 可以存取 Google Play Developer API。

![](%E6%88%AA%E5%9C%96_2021-08-22_%E4%B8%8B%E5%8D%884_20_21.png)

在建立 Service Account 的過程中，需要給 Service Account User 這個 Role。最後再新增一個 json key 並下載，我們會在下一步透過這個 json key 存取 Google Play Developer Api。

    ![](%E6%88%AA%E5%9C%96_2021-08-19_%E4%B8%8A%E5%8D%887.38.53.png)

    ![](%E6%88%AA%E5%9C%96_2021-08-22_%E4%B8%8B%E5%8D%884.28.43.png)

最後記得回到 Google Play Console 授予剛剛建立的 Account 存取權

![](%E6%88%AA%E5%9C%96_2021-08-22_%E4%B8%8B%E5%8D%884_32_10.png)

## 第二步

取得 key.json 檔後，就可以開始寫上傳 app 的 script 了。

### 安裝 python 套件

```bash
pip install google-api-python-client
pip install oauth2client
```

### 建立 Service

使用 ServiceAccountCredentials.from_json_keyfile_name() 並傳入剛剛下載的 json 建立 credential。最後組合用 google-api-python-client 傳入 credential 建立 service。

```python
import httplib2
from apiclient.discovery import build
from oauth2client.service_account import ServiceAccountCredentials, client

credentials = ServiceAccountCredentials.from_json_keyfile_name(
      'key.json',
      scopes=['https://www.googleapis.com/auth/androidpublisher'])
http = httplib2.Http()
http = credentials.authorize(http)

service = build('androidpublisher', 'v3', http=http)
```

### 透過 Service 操作 Google Play Developer API 上傳 app bundle

設定想操作的 package

```python
edit_request = service.edits().insert(body={}, packageName="com.example.your_app")
result = edit_request.execute()
edit_id = result['id']
```

上傳 app bundle

```python
apk_response = service.edits().bundles().upload(
    editId=edit_id, packageName=package_name, media_body=bundle_file).execute()
```

設定 Deploy 的狀態

```python
track_response = service.edits().tracks().update(
    editId=edit_id,
    track=track,
    packageName="com.example.your_app",
    body={
				u'releases': [{
		        u'name': "My First Release",
	          u'versionCodes': [str(apk_response['versionCode'])],
	          u'status': u'completed',
    }]}).execute()
```

track 參數有許多種選擇，需要根據需求調整，可以支援釋出到內部測試、Alpha 測試、Beta 測試、或生產環境，可以參考[這邊](https://developers.google.com/android-publisher/tracks)。

status 參數也有許多種選擇，可以設定釋出給一定百分比的使用者，或直接開放給所有使用者下載，更詳細的設定可以參考[這邊](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks#Status)。

完成所有步驟後，需要呼叫 commit，完成一系列的操作

```python
commit_request = service.edits().commit(
        editId=edit_id, packageName="com.example.your_app").execute()
```

完整的程式請參考[這邊](https://github.com/easylive1989/LittleFlowerApp/blob/develop/script/deploy.py)

## 更多操作

上面展示的代碼是上傳 app bundle，如果想要上傳的是 apk，則需要使用 edits.apks 系列的 api。另外其他可以用的操作，像是下面這段代碼，可以取得已經上傳的 app bundle 列表。

```python
edit_request = service.edits().insert(body={}, packageName=package_name)
result = edit_request.execute()
edit_id = result['id']

bundles_result = service.edits().bundles().list(
    editId=edit_id, packageName=package_name).execute()

for bundle in bundles_result['bundles']:
  print ('versionCode: %s, binary.sha1: %s' % (
      bundle['versionCode'], bundle['sha1']))
```

還有各式不一樣的 api ，像是修改測試人員的列表之類的，需要的朋友可以參考[這邊](https://developers.google.com/android-publisher/api-ref/rest)。

## 參考

- [googlesamples/android-play-publisher-api](https://github.com/googlesamples/android-play-publisher-api/tree/master/v3/python)
- [Google Play Developer Api](https://developers.google.com/android-publisher/api-ref/rest)