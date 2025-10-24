# 在測試中使用 Fluent Interface

新增時間: August 11, 2021 1:07 PM
最後編輯時間: October 3, 2025 12:04 AM
id: 3a966bd2ce1c4a4cb50da30e9b69b2b6
完成: Yes
類型: Medium
🧩 領域: Flutter (https://www.notion.so/Flutter-aec5ea3a198f49e18989ab7f4c851169?pvs=21)

寫單元測試的時候，我們常常會需要mock輸入資料，這其中有可能是從參數或者是相依物件傳入。而傳入資料結構也是各式各樣的，例如簡單的int, string到複雜的雙層Dictionary都是有可能的。

假設有一個翻譯機類別，建構子傳入翻譯文字，翻譯機則是負責接受輸入、檢查並輸出相對應的翻譯。

```csharp
public class Translator
{
    private readonly Dictionary<string, string> _translationLookup;

    public Translator(Dictionary<string, string> translationLookup)
    {
        _translationLookup = translationLookup;
    }
    
    public string Translate(string key)
    {
        if (!_translationLookup.ContainsKey(key))
        {
            throw new TranslationNotFoundException();
        }
        
        return _translationLookup[key];
    }
}
```

針對Translate方法寫了一個單元測試

```csharp
[Test]
public void Correct_Translate_When_Translation_Exist()
{
    var translator = new Translator(new Dictionary<string, string>
    {
        {"morning","good morning"},
        {"bye", "good bye"}
    });
    Assert.AreEqual("good morning", translator.Translate("morning"));
}
```

在這個情境很容易透過建構子設定測試輸入

重構一下測試

```csharp
public class Tests
{
    private Dictionary<string, string> _translationLookup;

    [Test]
    public void Correct_Translate_When_Translation_Exist()
    {
        GivenTranslationLookup(new Dictionary<string, string>
        {
            {"morning", "good morning"},
            {"bye", "good bye"}
        });
        TranslationShouldBe("good morning", "morning");
    }

    private void GivenTranslationLookup(Dictionary<string, string> translationLookup)
    {
        _translationLookup = translationLookup;
    }

    private void TranslationShouldBe(string expected, string key)
    {
        Assert.AreEqual(expected, new Translator(_translationLookup).Translate(key));
    }
}
```

假設今天Translator的商業邏輯更複雜一點，不只是翻譯，而是需要考慮多語系

```csharp
public class Translator
{
    private readonly Dictionary<string, Dictionary<Language, string>> _translationLookup;

    public Translator(Dictionary<string, Dictionary<Language, string>> translationLookup)
    {
        _translationLookup = translationLookup;
    }
    
    public string Translate(string key, Language language)
    {
        if (!_translationLookup.ContainsKey(key))
        {
            throw new TranslationNotFoundException();
        }
        
        if (!_translationLookup[key].ContainsKey(language))
        {
            throw new LanguageNotFoundException();
        }
        
        return _translationLookup[key][language];
    }
}
```

此時測試入輸入就會變得很長一串，當中包含很多與測試邏輯本身沒有關係的new Dictionary<...>

```csharp
public class Tests
{
    private Dictionary<string, Dictionary<Language, string>> _translationLookup;

    [Test]
    public void Correct_Translate_When_Translation_Exist()
    {
        GivenTranslationLookup(new Dictionary<string, Dictionary<Language, string>>
        {
            {"morning", new Dictionary<Language, string>()
            {
                {Language.EN, "good morning"},
                {Language.ZH_TW, "早安"}
            }},
            {"bye", new Dictionary<Language, string>()
            {
                {Language.EN, "good bye"},
                {Language.ZH_TW, "再見"}
            }}
        });
        
        TranslationShouldBe("good morning", "morning", Language.EN);
    }

    private void GivenTranslationLookup(Dictionary<string, Dictionary<Language, string>> translationLookup)
    {
        _translationLookup = translationLookup;
    }

    private void TranslationShouldBe(string expected, string key, Language language)
    {
        Assert.AreEqual(expected, new Translator(_translationLookup).Translate(key, language));
    }
}
```

此時我們可以透過Fluent Interface來改善測試代碼的可讀性

```csharp
public class Tests
{
    private Dictionary<string, Dictionary<Language, string>> _translationLookup;
    private Dictionary<Language, string> _languageMap;

    [SetUp]
    public void SetUp()
    {
        _translationLookup = new Dictionary<string, Dictionary<Language, string>>();
    }
    
    [Test]
    public void Correct_Translate_When_Translation_Exist()
    {
        GivenKey("morning")
            .GivenTranslation(Language.EN,"good morning")
            .GivenTranslation(Language.ZH_TW, "早安");
        
        GivenKey("bye")
            .GivenTranslation(Language.EN,"good bye")
            .GivenTranslation(Language.ZH_TW, "再見");
        
        TranslationShouldBe("good morning", "morning", Language.EN);
    }

    private Tests GivenKey(string key)
    {
        _languageMap = new Dictionary<Language, string>();
        _translationLookup.Add(key, _languageMap);
        return this;
    }
    
    private Tests GivenTranslation(Language language, string translation)
    {
        _languageMap.Add(language, translation);
        return this;
    }

    private void TranslationShouldBe(string expected, string key, Language language)
    {
        Assert.AreEqual(expected, new Translator(_translationLookup).Translate(key, language));
    }
}
```